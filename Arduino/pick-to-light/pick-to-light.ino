#include <SPI.h>
#include <WiFiNINA.h>
#include <ArduinoHttpClient.h>
#include <ArduinoJson.h>
#include <MD_Parola.h>
#include <MD_MAX72xx.h>

// ====== WiFi Credentials ======
char ssid[] = "realme 10";
char pass[] = "12345678";

// ====== Backend Config ======
const char* serverAddress = "10.136.10.197";  // Your FastAPI backend IP
int serverPort = 8000;
String apiPath = "/active-orders";  // <-- matches FastAPI route

WiFiClient wifi;
HttpClient client = HttpClient(wifi, serverAddress, serverPort);

// ====== LED Matrix Config ======
#define HARDWARE_TYPE MD_MAX72XX::FC16_HW
#define MAX_DEVICES 4   // Each CS has 4 chained devices (32x8)
#define CLK_PIN   8
#define DATA_PIN  10

// 6 Chip Select pins for 6 bins
const int csPins[6] = {2, 3, 4, 5, 6, 7};

// Create Parola objects for each bin
MD_Parola bins[6] = {
  MD_Parola(HARDWARE_TYPE, DATA_PIN, CLK_PIN, csPins[0], MAX_DEVICES),
  MD_Parola(HARDWARE_TYPE, DATA_PIN, CLK_PIN, csPins[1], MAX_DEVICES),
  MD_Parola(HARDWARE_TYPE, DATA_PIN, CLK_PIN, csPins[2], MAX_DEVICES),
  MD_Parola(HARDWARE_TYPE, DATA_PIN, CLK_PIN, csPins[3], MAX_DEVICES),
  MD_Parola(HARDWARE_TYPE, DATA_PIN, CLK_PIN, csPins[4], MAX_DEVICES),
  MD_Parola(HARDWARE_TYPE, DATA_PIN, CLK_PIN, csPins[5], MAX_DEVICES)
};

// Bin IDs
const char* binNames[6] = {"A1", "A2", "A3", "B1", "B2", "B3"};

// Struct for storing bin data
struct BinData {
  int redQty = 0;
  int blueQty = 0;
  int greenQty = 0;
};
BinData binData[6];

void setup() {
  Serial.begin(115200);

  // Start WiFi
  Serial.print("Connecting to ");
  Serial.println(ssid);
  while (WiFi.begin(ssid, pass) != WL_CONNECTED) {
    delay(2000);
    Serial.print(".");
  }
  Serial.println("Connected to WiFi!");

  // Init displays
  for (int i = 0; i < 6; i++) {
    bins[i].begin();
    bins[i].setIntensity(5);
    bins[i].displayClear();
  }
}

void loop() {
  fetchOrders();
  updateDisplays();
  delay(5000);  // fetch every 5 seconds
}

void fetchOrders() {
  Serial.println("=== Fetching active orders ===");

  client.get(apiPath);
  int statusCode = client.responseStatusCode();
  String response = client.responseBody();

  Serial.print("HTTP Status: ");
  Serial.println(statusCode);
  Serial.print("Response: ");
  Serial.println(response);

  if (statusCode == 200) {
    // Reset bin data
    for (int i = 0; i < 6; i++) {
      binData[i].redQty = 0;
      binData[i].blueQty = 0;
      binData[i].greenQty = 0;
    }

    // Parse JSON
    DynamicJsonDocument doc(4096);
    DeserializationError error = deserializeJson(doc, response);

    if (error) {
      Serial.print("deserializeJson() failed: ");
      Serial.println(error.c_str());
      return;
    }

    for (JsonObject order : doc.as<JsonArray>()) {
      String colour = order["colour"];
      JsonObject binsInOrder = order["bins"];

      for (int i = 0; i < 6; i++) {
        if (binsInOrder.containsKey(binNames[i])) {
          int qty = binsInOrder[binNames[i]];
          if (colour == "red") binData[i].redQty += qty;
          else if (colour == "blue") binData[i].blueQty += qty;
          else if (colour == "green") binData[i].greenQty += qty;

          Serial.print("Added ");
          Serial.print(colour);
          Serial.print(" ");
          Serial.print(qty);
          Serial.print(" to Bin[");
          Serial.print(i);
          Serial.print("] ");
          Serial.println(binNames[i]);
        }
      }
    }
  }
}

void updateDisplays() {
  for (int i = 0; i < 6; i++) {
    bins[i].displayClear();

    char buffer[100];
    buffer[0] = '\0';  // start with empty string

    // // Always show Bin ID first
    // snprintf(buffer, sizeof(buffer), "%s", binNames[i]);

    // Append only non-zero quantities
    if (binData[i].redQty > 0) {
      char temp[10];
      snprintf(temp, sizeof(temp), " R%d", binData[i].redQty);
      strncat(buffer, temp, sizeof(buffer) - strlen(buffer) - 1);
    }
    if (binData[i].blueQty > 0) {
      char temp[10];
      snprintf(temp, sizeof(temp), " B%d", binData[i].blueQty);
      strncat(buffer, temp, sizeof(buffer) - strlen(buffer) - 1);
    }
    if (binData[i].greenQty > 0) {
      char temp[10];
      snprintf(temp, sizeof(temp), " G%d", binData[i].greenQty);
      strncat(buffer, temp, sizeof(buffer) - strlen(buffer) - 1);
    }

    // Estimate text width: 5px per character (5px font + 1px space)
    int textWidth = strlen(buffer) * 5;
    int displayWidth = MAX_DEVICES * 8; // 32 pixels

    if (textWidth > displayWidth) {
      // Too long → scroll
      bins[i].displayText(buffer, PA_CENTER, 50, 0, PA_SCROLL_LEFT, PA_SCROLL_LEFT);
      while (!bins[i].displayAnimate()) {
        // Let Parola handle animation
      }
    } else {
      // Fits → static print
      bins[i].print(buffer);
    }
  }
}
