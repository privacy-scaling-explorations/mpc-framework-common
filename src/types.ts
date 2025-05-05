export type Circuit = {
  bristol: string;
  info: {
    constants: (CircuitIOInfo & { value: unknown })[];
    inputs: CircuitIOInfo[];
    outputs: CircuitIOInfo[];
  };
  mpcSettings: MpcParticipantSettings[];
};

export type CircuitIOInfo = {
  name: string;
  type: unknown;
  address: number;
  width: number;
};

export type MpcParticipantSettings = {
  name: string,
  inputs: string[],
  outputs: string[],
};

export type MpcSettings = MpcParticipantSettings[];

export type Engine = {
  run(
    circuit: Circuit,
    name: string,
    input: Record<string, unknown>,
    send: (to: string, msg: Uint8Array) => void,
  ): EngineSession;
};

export type EngineSession = {
  handleMessage(from: string, msg: Uint8Array): void;
  output(): Promise<Record<string, unknown>>;
};
