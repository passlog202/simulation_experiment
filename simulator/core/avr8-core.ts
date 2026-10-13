// ============================================================
// 智眸实验台 · AVR8 仿真核适配器 (Arduino Uno)
// 封装 avr8js，对外暴露统一 ISimulationCore 接口
// v1.0 2026-10-13
// ============================================================

import type { ISimulationCore, FirmwareFormat } from './types.js';
import { registry } from './registry.js';

// avr8js 从 CDN/本地加载（运行时动态 import，避免打包问题）
// import { CPU, avrInstruction, AVRIOPort, AVRUSART, parseHex } from 'avr8js';

export class AVR8Core implements ISimulationCore {
  readonly boardId = 'uno';
  readonly arch = 'AVR 8-bit';
  readonly clockMHz = 16;

  private cpu: any = null;
  private usart: any = null;
  private adcValue = 256; // 默认正常传感器值
  private serialCb: ((text: string) => void) | null = null;
  private running = false;
  private timerId: number | null = null;
  private serialBuf = '';
  private cycles = 0n;

  async loadFirmware(image: Uint8Array, format: FirmwareFormat): Promise<void> {
    if (format !== 'hex') throw new Error('[AVR8Core] 仅支持 hex 格式');

    const avr8js = await import('avr8js');
    const hexText = new TextDecoder().decode(image);

    // 解析 Intel HEX
    const program = new Uint16Array(0x8000);
    const bytes = this.parseHex(hexText);
    for (let i = 0; i < bytes.length; i += 2) {
      program[i >> 1] = bytes[i] | (bytes[i + 1] << 8);
    }

    this.cpu = new avr8js.CPU(program, avr8js.avrInstruction);
    const portB = new avr8js.AVRIOPort(this.cpu, 'B');
    const portC = new avr8js.AVRIOPort(this.cpu, 'C');
    const portD = new avr8js.AVRIOPort(this.cpu, 'D');
    this.usart = new avr8js.AVRUSART(this.cpu, () => {}, 16000000);

    // 串口发送 → 回调
    this.usart.onByteTransmit = (value: number) => {
      const ch = String.fromCharCode(value);
      if (ch === '\n') {
        this.emitSerial(this.serialBuf);
        this.serialBuf = '';
      } else if (ch !== '\r') {
        this.serialBuf += ch;
      }
    };
  }

  start(): void {
    if (!this.cpu || this.running) return;
    this.running = true;
    // 60fps 仿真循环
    this.timerId = window.setInterval(() => {
      try {
        // 每次 tick 运行约 16MHz/60 个周期
        for (let i = 0; i < 1000; i++) {
          this.cpu.tick();
          this.cycles++;
        }
      } catch (e) {
        // 仿真异常时停止
        this.stop();
      }
    }, 16);
  }

  stop(): void {
    this.running = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.serialBuf) {
      this.emitSerial(this.serialBuf);
      this.serialBuf = '';
    }
  }

  reset(): void {
    this.stop();
    this.cycles = 0n;
    this.serialBuf = '';
    // 重新加载需要再次调用 loadFirmware
  }

  onSerialData(cb: (text: string) => void): void {
    this.serialCb = cb;
  }

  sendSerial(text: string): void {
    if (!this.usart) return;
    for (const ch of text) {
      try {
        this.usart.onByteReceive?.(ch.charCodeAt(0));
      } catch { /* 忽略 */ }
    }
  }

  setADC(channel: number, value: number): void {
    // 钳制到 0~1023
    this.adcValue = Math.max(0, Math.min(1023, Math.round(value)));
    // TODO: 将值注入 avr8js 的 ADC 外设
    // avr8js 的 ADC 通过 AVRIOPort 的模拟输入模拟
  }

  setGPIO(pin: string, level: 0 | 1): void {
    // TODO: 注入到对应 PORT 的引脚
  }

  getMaxADC(): number { return 1023; }
  isRunning(): boolean { return this.running; }
  getCycles(): bigint { return this.cycles; }

  private emitSerial(text: string): void {
    this.serialCb?.(text);
  }

  private parseHex(hexText: string): Uint8Array {
    // 简化版 Intel HEX 解析
    const bytes: number[] = [];
    const lines = hexText.trim().split('\n');
    for (const line of lines) {
      if (!line.startsWith(':')) continue;
      const byteCount = parseInt(line.slice(1, 3), 16);
      const recordType = parseInt(line.slice(7, 9), 16);
      if (recordType !== 0) continue; // 只处理数据记录
      for (let i = 0; i < byteCount; i++) {
        bytes.push(parseInt(line.slice(9 + i * 2, 11 + i * 2), 16));
      }
    }
    return new Uint8Array(bytes);
  }
}

// ---- 注册 ----
registry.registerBoard({
  id: 'uno', name: 'Arduino Uno', core: 'avr8js',
  arch: 'AVR 8-bit', clockMHz: 16, flashKB: 32, sramKB: 2,
});
registry.registerCore('uno', () => new AVR8Core());
registry.registerFirmware({
  id: 'uart_hello', boardId: 'uno', name: '串口心跳',
  description: '开机自检 + 心跳输出', path: 'firmware/build/uart_hello/uart_hello.ino.hex',
  format: 'hex', size: 6604,
});
registry.registerFirmware({
  id: 'sensor_reader', boardId: 'uno', name: 'ADC采样',
  description: 'ADC温度采样 + 越界自动报警', path: 'firmware/build/sensor_reader/sensor_reader.ino.hex',
  format: 'hex', size: 11264,
});
registry.registerFirmware({
  id: 'led_flow', boardId: 'uno', name: '流水灯',
  description: '流水灯 + 串口命令控制', path: 'firmware/build/led_flow/led_flow.ino.hex',
  format: 'hex', size: 8289,
});
