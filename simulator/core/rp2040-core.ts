// ============================================================
// 智眸实验台 · RP2040 仿真核适配器 (树莓派 Pico)
// 封装 rp2040js，对外暴露统一 ISimulationCore 接口
// v1.0 2026-10-13 (骨架，待完整实现)
// ============================================================

import type { ISimulationCore, FirmwareFormat } from './types.js';
import { registry } from './registry.js';

export class RP2040Core implements ISimulationCore {
  readonly boardId = 'pico';
  readonly arch = 'ARM Cortex-M0+';
  readonly clockMHz = 125;

  private mcu: any = null;
  private serialCb: ((text: string) => void) | null = null;
  private running = false;
  private cycles = 0n;

  async loadFirmware(image: Uint8Array, format: FirmwareFormat): Promise<void> {
    if (format !== 'uf2' && format !== 'hex' && format !== 'bin') {
      throw new Error('[RP2040Core] 支持 uf2/hex/bin 格式');
    }
    const rp2040js = await import('rp2040js');
    this.mcu = new rp2040js.RP2040();

    // 加载固件到 Flash (0x10000000)
    // UF2 需要解析，HEX/BIN 直接写入
    if (format === 'uf2') {
      this.loadUF2(image);
    } else {
      this.mcu.flash.set(image, 0);
    }

    // UART0 输出 → 串口回调
    this.mcu.uart[0].onByte = (value: number) => {
      const ch = String.fromCharCode(value);
      // 缓冲处理换行（简化版，实际用行缓冲）
      this.emitSerial(ch);
    };
  }

  start(): void {
    if (!this.mcu || this.running) return;
    this.running = true;
    // RP2040 仿真主循环（简化，实际用 rp2040js 的 run 循环）
    const loop = () => {
      if (!this.running) return;
      try {
        // 每次执行一批指令
        for (let i = 0; i < 10000; i++) {
          this.mcu.step();
          this.cycles++;
        }
      } catch { this.stop(); return; }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop(): void { this.running = false; }

  reset(): void {
    this.stop();
    this.cycles = 0n;
  }

  onSerialData(cb: (text: string) => void): void {
    this.serialCb = cb;
  }

  sendSerial(text: string): void {
    if (!this.mcu) return;
    for (const ch of text) {
      this.mcu.uart[0].feedByte(ch.charCodeAt(0));
    }
  }

  setADC(channel: number, value: number): void {
    const clamped = Math.max(0, Math.min(4095, Math.round(value)));
    // TODO: 注入到 rp2040js 的 ADC 外设
  }

  setGPIO(pin: string, level: 0 | 1): void {
    // TODO: 注入到 GPIO
  }

  getMaxADC(): number { return 4095; }
  isRunning(): boolean { return this.running; }
  getCycles(): bigint { return this.cycles; }

  private emitSerial(text: string): void {
    this.serialCb?.(text);
  }

  private loadUF2(data: Uint8Array): void {
    // UF2 解析：每 512 字节一块，提取 payload 写入 flash
    const BLOCK_SIZE = 512;
    const PAYLOAD_SIZE = 476;
    for (let offset = 0; offset + BLOCK_SIZE <= data.length; offset += BLOCK_SIZE) {
      const targetAddr = new DataView(data.buffer, offset + 12, 4).getUint32(0, true);
      const payloadLen = new DataView(data.buffer, offset + 16, 4).getUint32(0, true);
      // UF2 基址 0x10000000 → flash 偏移
      const flashOffset = targetAddr - 0x10000000;
      if (flashOffset >= 0) {
        this.mcu.flash.set(data.slice(offset + 32, offset + 32 + payloadLen), flashOffset);
      }
    }
  }
}

// ---- 注册 ----
registry.registerBoard({
  id: 'pico', name: '树莓派 Pico', core: 'rp2040js',
  arch: 'ARM Cortex-M0+', clockMHz: 125, flashKB: 2048, sramKB: 264,
});
registry.registerCore('pico', () => new RP2040Core());
registry.registerFirmware({
  id: 'micropython', boardId: 'pico', name: 'MicroPython',
  description: 'MicroPython REPL，可交互执行 Python', path: 'firmware/pico/micropython-pico.uf2',
  format: 'uf2', size: 638464,
});
