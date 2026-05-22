type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ClassValue[]
  | Record<string, boolean | null | undefined>;

function flattenClasses(inputs: ClassValue[], output: string[]) {
  for (const input of inputs) {
    if (!input) {
      continue;
    }

    if (typeof input === "string" || typeof input === "number") {
      output.push(String(input));
      continue;
    }

    if (Array.isArray(input)) {
      flattenClasses(input, output);
      continue;
    }

    for (const [key, enabled] of Object.entries(input)) {
      if (enabled) {
        output.push(key);
      }
    }
  }
}

export function cn(...inputs: ClassValue[]) {
  const output: string[] = [];
  flattenClasses(inputs, output);
  return output.join(" ");
}
