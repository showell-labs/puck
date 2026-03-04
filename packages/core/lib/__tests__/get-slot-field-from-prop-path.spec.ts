import {
  getFieldFromPropPath,
  getSlotFieldFromPropPath,
} from "../get-slot-field-from-prop-path";

describe("get-slot-field-from-prop-path", () => {
  const fields: any = {
    items: {
      type: "slot",
      newItemPosition: "end",
    },
    plainText: {
      type: "text",
    },
    object: {
      type: "object",
      objectFields: {
        nestedSlot: {
          type: "slot",
          newItemPosition: "start",
        },
      },
    },
    list: {
      type: "array",
      arrayFields: {
        nestedSlot: {
          type: "slot",
          newItemPosition: "end",
        },
        nestedObject: {
          type: "object",
          objectFields: {
            nestedSlot: {
              type: "slot",
              newItemPosition: "start",
            },
          },
        },
      },
    },
  };

  it("returns a top-level slot field", () => {
    const field = getSlotFieldFromPropPath(fields, "items");

    expect(field).toEqual({
      type: "slot",
      newItemPosition: "end",
    });
  });

  it("returns a nested object slot field", () => {
    const field = getSlotFieldFromPropPath(fields, "object.nestedSlot");

    expect(field).toEqual({
      type: "slot",
      newItemPosition: "start",
    });
  });

  it("returns a nested array slot field", () => {
    const field = getSlotFieldFromPropPath(fields, "list[0].nestedSlot");

    expect(field).toEqual({
      type: "slot",
      newItemPosition: "end",
    });
  });

  it("supports nested object fields inside arrays", () => {
    const field = getSlotFieldFromPropPath(
      fields,
      "list[1].nestedObject.nestedSlot"
    );

    expect(field).toEqual({
      type: "slot",
      newItemPosition: "start",
    });
  });

  it("returns null for missing fields", () => {
    const field = getSlotFieldFromPropPath(fields, "does.not.exist");

    expect(field).toBeNull();
  });

  it("returns null for non-slot fields", () => {
    const slotField = getSlotFieldFromPropPath(fields, "plainText");
    const field = getFieldFromPropPath(fields, "plainText");

    expect(slotField).toBeNull();
    expect(field).toEqual({
      type: "text",
    });
  });
});
