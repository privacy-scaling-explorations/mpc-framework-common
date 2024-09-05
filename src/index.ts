export type Circuit = {
  bristol: string;
  info: {
    input_name_to_wire_index: Record<string, number>;
    constants: Record<string, { value: string; wire_index: number }>;
    output_name_to_wire_index: Record<string, number>;
  };
};

export type MpcParticipantSettings = {
  name?: string,
  inputs: string[],
  outputs: string[],
};

export type MpcSettings = MpcParticipantSettings[];

export type Backend = {
  run(
    circuit: Circuit,
    mpcSettings: MpcSettings,
    name: string,
    input: Record<string, unknown>,
    send: (to: string, msg: Uint8Array) => void,
  ): BackendSession;
};

export type BackendSession = {
  handleMessage(from: string, msg: Uint8Array): void;
  output(): Promise<Record<string, unknown>>;
};

export function checkSettingsValid(
  circuit: Circuit,
  mpcSettings: MpcSettings,
  name: string,
  input: Record<string, unknown>,
): Error | undefined {
  const circuitInputs = new Set(
    Object.keys(circuit.info.input_name_to_wire_index),
  );

  const circuitOutputs = new Set(
    Object.keys(circuit.info.output_name_to_wire_index),
  );

  // Check inputs are non-overlapping and match the circuit
  const participantInputs = new Set<string>();

  for (const participant of mpcSettings) {
    for (const input of participant.inputs) {
      if (participantInputs.has(input)) {
        return new Error(`Duplicate input: ${input}`);
      }

      participantInputs.add(input);
    }
  }

  if (!areSetsEqual(participantInputs, circuitInputs)) {
    return new Error('Participant inputs do not match the circuit');
  }

  // Check output names are in the circuit
  for (const participant of mpcSettings) {
    for (const output of participant.outputs) {
      if (!circuitOutputs.has(output)) {
        return new Error(`Output ${output} is not in the circuit`);
      }
    }
  }

  // Check supplied inputs match our inputs
  const inputKeys = new Set(Object.keys(input));
  
  const currentParticipant = mpcSettings.find(
    (participant, i) => (participant.name ?? i.toString()) === name,
  );

  if (!currentParticipant) {
    return new Error(`Could not find participant with name ${name}`);
  }

  const requiredInputs = new Set(currentParticipant.inputs);

  if (!areSetsEqual(inputKeys, requiredInputs)) {
    return new Error('Input keys do not match participant inputs');
  }

  return undefined;
}

function areSetsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) {
    return false;
  }

  for (const item of a) {
    if (!b.has(item)) {
      return false;
    }
  }

  return true;
}
