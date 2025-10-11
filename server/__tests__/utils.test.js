const {
  sanitizeOptions,
  normalizeBoolean,
  extractQuestionsPerSessionField,
  parseQuestionsPerSession,
  sanitizeModuleSelection,
  extractModuleIdList
} = require("../utils");

describe("sanitizeOptions", () => {
  it("filters out empty option labels and normalizes structure", () => {
    const result = sanitizeOptions([
      { id: "a", label: " Ja ", is_correct: 1 },
      { label: "", isCorrect: false },
      { label: "Nee", correct: false }
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "a", label: "Ja", isCorrect: true });
    expect(result[1].label).toBe("Nee");
    expect(typeof result[1].id).toBe("string");
    expect(result[1].id).not.toHaveLength(0);
  });

  it("returns an empty array for non-array input", () => {
    expect(sanitizeOptions(null)).toEqual([]);
  });
});

describe("normalizeBoolean", () => {
  it("falls back to provided default when value is missing", () => {
    expect(normalizeBoolean(undefined, true)).toBe(true);
    expect(normalizeBoolean(null, false)).toBe(false);
    expect(normalizeBoolean("", true)).toBe(true);
  });

  it("understands multiple string variants", () => {
    expect(normalizeBoolean("Ja", false)).toBe(true);
    expect(normalizeBoolean("nee", true)).toBe(false);
    expect(normalizeBoolean("ON", false)).toBe(true);
  });
});

describe("extractQuestionsPerSessionField", () => {
  it("returns the first matching field that contains a value", () => {
    const source = {
      questions_per_session: "",
      questions: 5,
      questionspersession: 7
    };

    expect(extractQuestionsPerSessionField(source)).toBe(5);
  });

  it("ignores non-object inputs", () => {
    expect(extractQuestionsPerSessionField(null)).toBeUndefined();
  });
});

describe("parseQuestionsPerSession", () => {
  it("parses valid numeric input and floors decimals", () => {
    expect(parseQuestionsPerSession("3,7", 1)).toBe(3);
    expect(parseQuestionsPerSession(4.9, 1)).toBe(4);
  });

  it("falls back for invalid values", () => {
    expect(parseQuestionsPerSession("abc", 2)).toBe(2);
    expect(parseQuestionsPerSession(-1, 2)).toBe(2);
  });
});

describe("sanitizeModuleSelection", () => {
  it("keeps only valid module identifiers", () => {
    const validIds = ["module-1", "module-2"];
    const selection = ["module-1", " ", "module-3", "module-2"];

    expect(sanitizeModuleSelection(selection, validIds)).toEqual([
      "module-1",
      "module-2"
    ]);
  });

  it("handles single string selections", () => {
    expect(sanitizeModuleSelection("module-1", ["module-1"])).toEqual([
      "module-1"
    ]);
  });
});

describe("extractModuleIdList", () => {
  it("splits comma separated strings into trimmed values", () => {
    expect(extractModuleIdList("a, b ,c")).toEqual(["a", "b", "c"]);
  });

  it("returns the original array when provided", () => {
    const ids = ["x", "y"];
    expect(extractModuleIdList(ids)).toBe(ids);
  });
});
