import { expect } from "chai";
import { checkSettingsValid, Circuit } from "../src";

const aPlusB: Circuit = {
  bristol: [
    '1 3',
    '2 1 1',
    '1 1',
    '',
    '2 1 0 1 2 AAddB',
  ].join('\n'),
  info: {
    input_name_to_wire_index: {
      b: 1,
      a: 0,
    },
    constants: {},
    output_name_to_wire_index: {
      c: 2,
    },
  },
};

const mpcSettings = [
  {
    name: 'alice',
    inputs: ['a'],
    outputs: ['c'],
  },
  {
    name: 'bob',
    inputs: ['b'],
    outputs: ['c'],
  },
];

describe('checkSettingsValid', () => {
  it('accepts valid settings', () => {
    const checkResult = checkSettingsValid(
      aPlusB,
      mpcSettings,
      'alice',
      { a: 3 },
    );

    expect(checkResult).to.be.undefined;
  });

  it('rejects name not in mpcSettings', () => {
    const checkResult = checkSettingsValid(
      aPlusB,
      mpcSettings,
      'charlie',
      { a: 3 },
    );

    expect(checkResult).to.be.an.instanceOf(Error);
  });

  it('rejects missing input', () => {
    const checkResult = checkSettingsValid(
      aPlusB,
      mpcSettings,
      'alice',
      {}, // missing a
    );

    expect(checkResult).to.be.an.instanceOf(Error);
  });

  it('rejects additional input', () => {
    const checkResult = checkSettingsValid(
      aPlusB,
      mpcSettings,
      'alice',
      { a: 3, x: 5 }, // x is not an input to the circuit
    );

    expect(checkResult).to.be.an.instanceOf(Error);
  });

  it('rejects overlapping inputs', () => {
    const checkResult = checkSettingsValid(
      aPlusB,
      [
        {
          name: 'alice',
          inputs: ['a', 'b'],
          outputs: ['c'],
        },
        {
          name: 'bob',
          inputs: ['b'], // alice is already providing b
          outputs: ['c'],
        },
      ],
      'alice',
      { a: 3 },
    );

    expect(checkResult).to.be.an.instanceOf(Error);
  });

  it('rejects when output is not in the circuit', () => {
    const checkResult = checkSettingsValid(
      aPlusB,
      [
        {
          name: 'alice',
          inputs: ['a'],
          outputs: ['d'], // d is not an output of the circuit
        },
        {
          name: 'bob',
          inputs: ['b'],
          outputs: ['c'],
        },
      ],
      'alice',
      { a: 3 },
    );

    expect(checkResult).to.be.an.instanceOf(Error);
  });

  it('rejects when a circuit input is not required by anyone in mpcSettings', () => {
    const checkResult = checkSettingsValid(
      aPlusB,
      [
        {
          name: 'alice',
          inputs: [], // circuit requires a but it's missing
          outputs: ['c'],
        },
        {
          name: 'bob',
          inputs: ['b'],
          outputs: ['c'],
        },
      ],
      'alice',
      {},
    );

    expect(checkResult).to.be.an.instanceOf(Error);
  });
});
