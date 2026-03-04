import type { Field, Fields, SlotField } from "../types";

const stripArrayIndexes = (segment: string) => segment.replace(/\[\d+\]/g, "");

const getNestedFields = (field: Field): Fields | null => {
  if (field.type === "array") {
    return field.arrayFields as Fields;
  }

  if (field.type === "object") {
    return field.objectFields as Fields;
  }

  return null;
};

export const getFieldFromPropPath = (
  fields: Fields | undefined,
  propPath: string
): Field | null => {
  if (!fields || !propPath) {
    return null;
  }

  const segments = propPath.split(".").filter(Boolean);
  let currentFields: Fields | undefined = fields;

  for (let index = 0; index < segments.length; index++) {
    const segment = stripArrayIndexes(segments[index]);

    if (!segment || !currentFields) {
      return null;
    }

    const field = currentFields[segment as keyof typeof currentFields] as
      | Field
      | undefined;

    if (!field) {
      return null;
    }

    if (index === segments.length - 1) {
      return field;
    }

    currentFields = getNestedFields(field) ?? undefined;
  }

  return null;
};

export const getSlotFieldFromPropPath = (
  fields: Fields | undefined,
  propPath: string
): SlotField | null => {
  const field = getFieldFromPropPath(fields, propPath);

  return field?.type === "slot" ? field : null;
};
