import { EXAMPLES as customerExamples, OUTPUT_SCHEMA as customerSchema, USER_PROMPT_TEMPLATE as customerTemplate, METADATA as customerMeta } from "../lib/prompts/customer"
import { EXAMPLES as inventoryExamples, OUTPUT_SCHEMA as inventorySchema, USER_PROMPT_TEMPLATE as inventoryTemplate, METADATA as inventoryMeta } from "../lib/prompts/inventory"
import { EXAMPLES as procurementExamples, OUTPUT_SCHEMA as procurementSchema, USER_PROMPT_TEMPLATE as procurementTemplate, METADATA as procurementMeta, EMAIL_DRAFT_EXAMPLES, EMAIL_DRAFT_SCHEMA, EMAIL_DRAFT_USER_TEMPLATE } from "../lib/prompts/procurement"
import { EXAMPLES as supplierExamples, OUTPUT_SCHEMA as supplierSchema, USER_PROMPT_TEMPLATE as supplierTemplate, METADATA as supplierMeta } from "../lib/prompts/supplier"
import { EXAMPLES as analyticsExamples, OUTPUT_SCHEMA as analyticsSchema, USER_PROMPT_TEMPLATE as analyticsTemplate, METADATA as analyticsMeta } from "../lib/prompts/analytics"

function testPrompts() {
  console.log("=========================================")
  console.log("🚀 Testing Prompt Management System Examples")
  console.log("=========================================\n")

  // --- Customer prompt test ---
  console.log(`📋 Prompt: ${customerMeta.name} (v${customerMeta.description})`)
  customerExamples.forEach((ex, i) => {
    console.log(`  Example ${i + 1} Input Render:`)
    console.log(`  """\n  ${customerTemplate(ex.input).replace(/\n/g, "\n  ")}\n  """`)
    // Validate output matches Zod
    customerSchema.parse(ex.output)
    console.log("  ✅ Zod parsing validation passed.")
  })
  console.log("-----------------------------------------\n")

  // --- Inventory prompt test ---
  console.log(`📋 Prompt: ${inventoryMeta.name}`)
  inventoryExamples.forEach((ex, i) => {
    console.log(`  Example ${i + 1} Input Render:`)
    console.log(`  """\n  ${inventoryTemplate(ex.input).replace(/\n/g, "\n  ")}\n  """`)
    // Validate output matches Zod
    inventorySchema.parse(ex.output)
    console.log("  ✅ Zod parsing validation passed.")
  })
  console.log("-----------------------------------------\n")

  // --- Procurement prompt test ---
  console.log(`📋 Prompt: ${procurementMeta.name}`)
  procurementExamples.forEach((ex, i) => {
    console.log(`  Example ${i + 1} Input Render:`)
    console.log(`  """\n  ${procurementTemplate(ex.input).replace(/\n/g, "\n  ")}\n  """`)
    // Validate output matches Zod
    procurementSchema.parse(ex.output)
    console.log("  ✅ Zod parsing validation passed.")
  })
  console.log("-----------------------------------------\n")

  // --- Procurement Email Draft prompt test ---
  console.log(`📋 Prompt: procurement-email-drafter`)
  EMAIL_DRAFT_EXAMPLES.forEach((ex, i) => {
    console.log(`  Example ${i + 1} Input Render:`)
    console.log(`  """\n  ${EMAIL_DRAFT_USER_TEMPLATE(ex.input).replace(/\n/g, "\n  ")}\n  """`)
    // Validate output matches Zod
    EMAIL_DRAFT_SCHEMA.parse(ex.output)
    console.log("  ✅ Zod parsing validation passed.")
  })
  console.log("-----------------------------------------\n")

  // --- Supplier prompt test ---
  console.log(`📋 Prompt: ${supplierMeta.name}`)
  supplierExamples.forEach((ex, i) => {
    console.log(`  Example ${i + 1} Input Render:`)
    console.log(`  """\n  ${supplierTemplate(ex.input).replace(/\n/g, "\n  ")}\n  """`)
    // Validate output matches Zod
    supplierSchema.parse(ex.output)
    console.log("  ✅ Zod parsing validation passed.")
  })
  console.log("-----------------------------------------\n")

  // --- Analytics prompt test ---
  console.log(`📋 Prompt: ${analyticsMeta.name}`)
  analyticsExamples.forEach((ex, i) => {
    console.log(`  Example ${i + 1} Input Render:`)
    console.log(`  """\n  ${analyticsTemplate(ex.input).replace(/\n/g, "\n  ")}\n  """`)
    // Validate output matches Zod
    analyticsSchema.parse(ex.output)
    console.log("  ✅ Zod parsing validation passed.")
  })
  console.log("=========================================")
  console.log("✅ All prompt validation tests passed successfully!")
  console.log("=========================================")
}

testPrompts()
