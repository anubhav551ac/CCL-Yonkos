/*
  Landslide Monitor - Arduino Nano Ultrasonic Sensor
  
  Connections:
  - VCC to 5V
  - GND to GND
  - Trig to Digital Pin 2
  - Echo to Digital Pin 4
*/

void setup() {
  pinMode(2, OUTPUT); // Trigger pin
  pinMode(4, INPUT);  // Echo pin
  Serial.begin(9600); // Enable serial monitor
}

void loop() {
  // Send pulse
  digitalWrite(2, LOW);
  delayMicroseconds(4);
  digitalWrite(2, HIGH);
  delayMicroseconds(10);
  digitalWrite(2, LOW);
  
  // Read pulse duration
  long t = pulseIn(4, HIGH);
  
  // Convert to distance
  long inches = t / 74 / 2;
  long cm = t / 29 / 2;
  
  // Send data in format the web app expects
  Serial.print(inches);
  Serial.println(" inches");
  Serial.print(cm);
  Serial.println(" cm");
  Serial.println(); // Empty line for separation
  
  delay(2000); // Wait 2 seconds (faster than your 3000ms)
}