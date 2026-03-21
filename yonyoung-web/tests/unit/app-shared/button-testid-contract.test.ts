import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const ROOT_DIRECTORIES = ["app", "components"];
const TEST_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)+$/;

type ContractViolation = {
  file: string;
  line: number;
  column: number;
  reason: string;
};

const listSourceFiles = (): string[] => {
  const files: string[] = [];

  const walk = (targetPath: string): void => {
    const entries = fs.readdirSync(targetPath, { withFileTypes: true });
    for (const entry of entries) {
      const resolved = path.join(targetPath, entry.name);
      if (entry.isDirectory()) {
        walk(resolved);
        continue;
      }

      if (/\.tsx?$/.test(entry.name)) {
        files.push(resolved);
      }
    }
  };

  for (const root of ROOT_DIRECTORIES) {
    if (fs.existsSync(root)) {
      walk(root);
    }
  }

  return files;
};

const getAttribute = (
  node: ts.JsxOpeningLikeElement,
  attributeName: string,
): ts.JsxAttribute | null => {
  for (const property of node.attributes.properties) {
    if (ts.isJsxAttribute(property) && property.name.text === attributeName) {
      return property;
    }
  }
  return null;
};

const isButtonLikeElement = (node: ts.JsxOpeningLikeElement, sourceFile: ts.SourceFile): boolean => {
  const tagName = ts.isIdentifier(node.tagName)
    ? node.tagName.text
    : node.tagName.getText(sourceFile);

  if (tagName === "button") {
    return true;
  }

  if (tagName === "input") {
    const typeAttribute = getAttribute(node, "type");
    if (
      typeAttribute?.initializer &&
      ts.isStringLiteral(typeAttribute.initializer) &&
      ["submit", "button", "reset"].includes(typeAttribute.initializer.text)
    ) {
      return true;
    }
  }

  const roleAttribute = getAttribute(node, "role");
  if (
    roleAttribute?.initializer &&
    ts.isStringLiteral(roleAttribute.initializer) &&
    roleAttribute.initializer.text === "button"
  ) {
    return true;
  }

  return false;
};

const validateTestIdPattern = (attribute: ts.JsxAttribute): boolean => {
  if (!attribute.initializer) {
    return false;
  }

  if (ts.isStringLiteral(attribute.initializer)) {
    return TEST_ID_PATTERN.test(attribute.initializer.text);
  }

  if (ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression) {
    const expression = attribute.initializer.expression;

    if (ts.isTemplateExpression(expression)) {
      const prefix = expression.head.text;
      return prefix.length > 0 && TEST_ID_PATTERN.test(prefix.endsWith("-") ? prefix.slice(0, -1) : prefix);
    }

    if (ts.isNoSubstitutionTemplateLiteral(expression)) {
      return TEST_ID_PATTERN.test(expression.text);
    }
  }

  return false;
};

const collectViolations = (): ContractViolation[] => {
  const violations: ContractViolation[] = [];

  for (const filePath of listSourceFiles()) {
    const sourceText = fs.readFileSync(filePath, "utf8");
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    const visit = (node: ts.Node): void => {
      if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
        if (isButtonLikeElement(node, sourceFile)) {
          const testIdAttribute = getAttribute(node, "data-testid");
          const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));

          if (!testIdAttribute) {
            violations.push({
              file: filePath,
              line: position.line + 1,
              column: position.character + 1,
              reason: "missing data-testid",
            });
          } else if (!validateTestIdPattern(testIdAttribute)) {
            violations.push({
              file: filePath,
              line: position.line + 1,
              column: position.character + 1,
              reason: "invalid data-testid naming (expected domain-action[-context])",
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  return violations;
};

describe("button testid static contract", () => {
  it("ensures all button-like elements define valid data-testid", () => {
    const violations = collectViolations();
    expect(violations).toEqual([]);
  });
});
