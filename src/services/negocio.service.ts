import { toErrorMessage } from "./errors";
import type { Negocio, NegocioInput } from "../../electron/db/types";

export const negocioService = {
  async get(): Promise<Negocio | null> {
    try {
      return await window.electronAPI.negocio.get();
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error });
    }
  },

  async update(data: NegocioInput): Promise<Negocio> {
    try {
      return await window.electronAPI.negocio.update(data);
    } catch (error) {
      throw new Error(toErrorMessage(error), { cause: error });
    }
  },
};