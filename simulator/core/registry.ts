// ============================================================
// 智眸实验台 · 核心注册表（单例）
// v1.0 2026-10-13
// 后期扩展：只需调用 registerCore / registerBoard / registerFirmware
// ============================================================

import type { ISimulationCore, FirmwareMeta, BoardMeta } from './types.js';

type CoreFactory = () => ISimulationCore;

class CoreRegistry {
  private cores = new Map<string, CoreFactory>();
  private boards = new Map<string, BoardMeta>();
  private firmwares = new Map<string, FirmwareMeta[]>();

  /** 注册仿真核工厂 */
  registerCore(boardId: string, factory: CoreFactory): this {
    this.cores.set(boardId, factory);
    return this;
  }

  /** 注册开发板 */
  registerBoard(meta: BoardMeta): this {
    this.boards.set(meta.id, meta);
    return this;
  }

  /** 注册固件 */
  registerFirmware(meta: FirmwareMeta): this {
    const list = this.firmwares.get(meta.boardId) ?? [];
    list.push(meta);
    this.firmwares.set(meta.boardId, list);
    return this;
  }

  /** 创建仿真核实例 */
  createCore(boardId: string): ISimulationCore {
    const factory = this.cores.get(boardId);
    if (!factory) throw new Error(`[Registry] 未注册的开发板: ${boardId}`);
    return factory();
  }

  /** 列出所有开发板 */
  listBoards(): BoardMeta[] {
    return [...this.boards.values()];
  }

  /** 列出某开发板的固件 */
  listFirmware(boardId: string): FirmwareMeta[] {
    return this.firmwares.get(boardId) ?? [];
  }

  /** 按ID查找固件 */
  findFirmware(boardId: string, firmwareId: string): FirmwareMeta | undefined {
    return this.listFirmware(boardId).find(f => f.id === firmwareId);
  }

  /** 检查开发板是否已注册 */
  hasBoard(boardId: string): boolean {
    return this.boards.has(boardId);
  }
}

/** 全局单例 */
export const registry = new CoreRegistry();
