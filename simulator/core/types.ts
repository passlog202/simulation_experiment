// ============================================================
// 智眸实验台 · 仿真核统一接口定义
// v1.0 2026-10-13
// ============================================================

/** 固件格式 */
export type FirmwareFormat = 'hex' | 'uf2' | 'bin';

/** 统一仿真核接口 — 所有仿真核必须实现 */
export interface ISimulationCore {
  readonly boardId: string;
  readonly arch: string;
  readonly clockMHz: number;

  loadFirmware(image: Uint8Array, format: FirmwareFormat): Promise<void>;
  start(): void;
  stop(): void;
  reset(): void;

  onSerialData(cb: (text: string) => void): void;
  sendSerial(text: string): void;

  setADC(channel: number, value: number): void;
  setGPIO(pin: string, level: 0 | 1): void;
  getMaxADC(): number;

  isRunning(): boolean;
  getCycles(): bigint;
}

/** 固件元数据 */
export interface FirmwareMeta {
  id: string;
  boardId: string;
  name: string;
  description: string;
  path: string;
  format: FirmwareFormat;
  size: number;
}

/** 开发板元数据 */
export interface BoardMeta {
  id: string;
  name: string;
  core: string;
  arch: string;
  clockMHz: number;
  flashKB: number;
  sramKB: number;
}

/** 串口事件 */
export interface SerialEvent {
  boardId: string;
  text: string;
  timestamp: number;
}

/** 故障注入目标 */
export interface FaultTarget {
  type: 'adc' | 'gpio';
  channel?: number;
  pin?: string;
  value: number;
}
