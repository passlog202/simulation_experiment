// 固件1: 串口Hello + 芯片自检信息
// 用于演示 UART 串口输出
void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println(F("================================"));
  Serial.println(F("[BOOT] ATmega328P @ 16MHz"));
  Serial.println(F("[BOOT] Flash: 32KB  SRAM: 2KB"));
  Serial.println(F("[BOOT] Firmware: uart_hello v1.0"));
  Serial.println(F("[BOOT] Self-test... OK"));
  Serial.println(F("================================"));
}

void loop() {
  static unsigned long count = 0;
  Serial.print(F("[SYS] heartbeat #"));
  Serial.print(count++);
  Serial.print(F("  uptime="));
  Serial.print(millis() / 1000);
  Serial.println(F("s"));
  delay(2000);
}
