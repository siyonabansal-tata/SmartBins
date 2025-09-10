#include <LedControl.h>

// DIN=10, CLK=8, CS=9, 4 devices chained
LedControl lc = LedControl(10, 8,7, 4);

// 8x8 bitmap for 'R'
byte R_char[8] = {
  B01111110,
  B01000001,
  B01000001,
  B01111110,
  B01001000,
  B01000100,
  B01000010,
  B00000000
};

void setup() {
  for (int i = 0; i < 4; i++) {
    lc.shutdown(i, false);   // Wake up each MAX7219
    lc.setIntensity(i, 8);   // Brightness (0-15)
    lc.clearDisplay(i);      // Clear display
  }

  // Display 'R' on first module (device 0)
  for (int row = 0; row < 8; row++) {
    lc.setRow(0, row, R_char[row]);
  }
}

void loop(){

}


