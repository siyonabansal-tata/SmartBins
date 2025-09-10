import qrcode

def generate_simple_qr():
    """Generate QR code with medicine name and quantity in simple format"""
    
    # Medicine data
    medicine_name = "Paracetamol"
    quantity = 10
    
    # Create simple comma-separated format
    qr_data = f"{medicine_name},{quantity}"
    
    print(f"Generating QR code for: {qr_data}")
    
    # Create QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    # Create image
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Generate filename
    filename = f"medicine_{medicine_name}_{quantity}.png"
    
    # Save QR code
    img.save(filename)
    
    print(f"✓ QR code generated successfully!")
    print(f"✓ Saved as: {filename}")
    print(f"✓ QR code contains: {qr_data}")

if __name__ == "__main__":
    generate_simple_qr()