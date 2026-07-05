import { PrismaClient, Product, Customer, Supplier } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error("❌ Error: DATABASE_URL environment variable is missing.")
  process.exit(1)
}

const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🧹 Cleaning existing data...")
  
  // Clean tables in reverse dependency order
  await prisma.agentLog.deleteMany()
  await prisma.approval.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.email.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.purchaseOrderItem.deleteMany()
  await prisma.purchaseOrder.deleteMany()
  await prisma.inventory.deleteMany()
  await prisma.product.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.user.deleteMany()
  await prisma.customer.deleteMany()

  console.log("👥 Seeding Users (Staff & Agents)...")
  const admin = await prisma.user.create({
    data: {
      email: "admin@opspilot.ai",
      name: "Sarah Jenkins",
      role: "ADMIN",
      clerkId: "user_admin_1",
    },
  })

  const agentSupport = await prisma.user.create({
    data: {
      email: "support-agent@opspilot.ai",
      name: "SupportCopilot",
      role: "AI_AGENT",
      clerkId: "user_agent_support",
    },
  })

  await prisma.user.create({
    data: {
      email: "logistics-agent@opspilot.ai",
      name: "LogisticsPilot",
      role: "AI_AGENT",
      clerkId: "user_agent_logistics",
    },
  })

  console.log("🏢 Seeding Suppliers...")
  const suppliers = [
    { name: "Apex Distribution", contactName: "David Lee", email: "orders@apexdist.com", phone: "+1-555-0192" },
    { name: "ByteSize Logistics", contactName: "Elena Rostova", email: "support@bytesizelog.com", phone: "+1-555-0143" },
    { name: "ElectroSource Inc.", contactName: "Marcus Vance", email: "sales@electrosource.com", phone: "+1-555-0177" },
    { name: "Horizon Tech Wholesalers", contactName: "Fiona Gallagher", email: "wholesale@horizontech.com", phone: "+1-555-0182" },
    { name: "Synergy Components", contactName: "Kenji Sato", email: "supply@synergycomp.com", phone: "+1-555-0111" },
  ]

  const seededSuppliers: Supplier[] = []
  for (const s of suppliers) {
    const supplier = await prisma.supplier.create({ data: s })
    seededSuppliers.push(supplier)
  }

  console.log("📦 Seeding Products...")
  const products = [
    { sku: "IPHONE15PRO", name: "iPhone 15 Pro Max 256GB", description: "Flagship Apple smartphone with Titanium design", price: 1199.99 },
    { sku: "MACBOOKPRO14M3", name: "MacBook Pro 14 M3 16GB/512GB", description: "Professional laptop with Apple M3 silicon", price: 1799.99 },
    { sku: "SONYWH1000XM5", name: "Sony WH-1000XM5 ANC Headphones", description: "Industry leading noise-canceling headphones", price: 349.99 },
    { sku: "DELLU2723QE", name: "Dell UltraSharp 27 4K USB-C Monitor", description: "High performance color accurate IPS display", price: 479.99 },
    { sku: "LOGIMX3S", name: "Logitech MX Master 3S Mouse", description: "Ergonomic wireless mouse for productivity", price: 99.99 },
    { sku: "KEYCHRONK2", name: "Keychron K2 Mechanical Keyboard", description: "Wireless mechanical keyboard with Gateron switches", price: 79.99 },
    { sku: "IPADAIRM1", name: "iPad Air 10.9 M1 64GB", description: "Lightweight Apple tablet powered by M1 chip", price: 599.99 },
    { sku: "SAMSUNGS24U", name: "Samsung Galaxy S24 Ultra 512GB", description: "Premium Android smartphone with AI capabilities", price: 1299.99 },
    { sku: "ANKER737", name: "Anker 737 Power Bank 24K", description: "140W ultra-high capacity power bank", price: 149.99 },
    { sku: "BOSEQCII", name: "Bose QuietComfort Earbuds II", description: "Next-gen true wireless ANC earbuds", price: 299.99 },
  ]

  const seededProducts: Product[] = []
  for (const p of products) {
    const product = await prisma.product.create({ data: p })
    seededProducts.push(product)
  }

  console.log("🗄️ Seeding Inventory...")
  const inventoryLocations = ["Aisle A-4", "Aisle B-2", "Aisle C-12", "Warehouse Bin 3", "Overstock A-1"]
  for (const product of seededProducts) {
    const randomQty = Math.floor(Math.random() * 45) + 5 // 5 to 50 items
    const randomLoc = inventoryLocations[Math.floor(Math.random() * inventoryLocations.length)]
    
    await prisma.inventory.create({
      data: {
        productId: product.id,
        quantity: randomQty,
        location: randomLoc,
        minStockLevel: 10,
      },
    })
  }

  console.log("👤 Seeding Customers...")
  const customers = [
    { name: "Alice Smith", email: "alice.smith@gmail.com", phone: "+1-555-1234", company: "Smith Tech Labs" },
    { name: "Bob Johnson", email: "bob.johnson@outlook.com", phone: "+1-555-5678", company: "Johnson Legal" },
    { name: "Charlie Davis", email: "charlie.d@yahoo.com", phone: "+1-555-9012" },
    { name: "Diana Prince", email: "diana@themyscira.org", phone: "+1-555-3456", company: "Wayne Enterprises" },
    { name: "Evan Wright", email: "evan.wright@wrightinc.com", phone: "+1-555-7890", company: "Wright & Co." },
    { name: "Fiona Gallagher", email: "fiona.g@gallaghers.com", phone: "+1-555-2345" },
    { name: "George Costanza", email: "george@vandelayindustries.com", phone: "+1-555-6789", company: "Vandelay Industries" },
    { name: "Hannah Abbott", email: "hannah@abbottbooks.com", phone: "+1-555-0123", company: "Abbott Books" },
    { name: "Ian Malcolm", email: "chaos.malcolm@jurassic.com", phone: "+1-555-4567", company: "InGen Research" },
    { name: "Julia Roberts", email: "julia@prettywoman.com", phone: "+1-555-8901" },
    { name: "Kevin Bacon", email: "kevin.b@sixdegrees.org", phone: "+1-555-2468" },
    { name: "Laura Croft", email: "tomb.raider@croftmanor.com", phone: "+1-555-1357", company: "Croft Holdings" },
    { name: "Michael Scott", email: "mscott@dundermifflin.com", phone: "+1-555-8642", company: "Dunder Mifflin Paper Co." },
    { name: "Natalie Portman", email: "natalie@portmantheatre.org", phone: "+1-555-9753" },
    { name: "Oliver Queen", email: "oqueen@queenindustries.com", phone: "+1-555-0864", company: "Queen Consolidated" },
  ]

  const seededCustomers: Customer[] = []
  for (const c of customers) {
    const customer = await prisma.customer.create({ data: c })
    seededCustomers.push(customer)
  }

  console.log("🛒 Seeding Orders...")
  // Generate 12 random orders
  for (let i = 1; i <= 12; i++) {
    const randomCustomer = seededCustomers[Math.floor(Math.random() * seededCustomers.length)]
    
    // Choose 1 to 3 items for the order
    const itemCount = Math.floor(Math.random() * 3) + 1
    const chosenProducts: Product[] = []
    
    // Select unique products
    while (chosenProducts.length < itemCount) {
      const prod = seededProducts[Math.floor(Math.random() * seededProducts.length)]
      if (!chosenProducts.includes(prod)) {
        chosenProducts.push(prod)
      }
    }

    let orderTotal = 0
    const orderItemsData: { productId: string; quantity: number; unitPrice: Product["price"] }[] = []

    for (const prod of chosenProducts) {
      const quantity = Math.floor(Math.random() * 2) + 1 // 1 or 2 items
      const itemPrice = Number(prod.price)
      orderTotal += itemPrice * quantity

      orderItemsData.push({
        productId: prod.id,
        quantity,
        unitPrice: prod.price,
      })
    }

    await prisma.order.create({
      data: {
        customerId: randomCustomer.id,
        userId: i % 2 === 0 ? admin.id : agentSupport.id,
        status: i === 1 ? "PENDING" : i === 2 ? "PROCESSING" : "DELIVERED",
        totalAmount: orderTotal,
        items: {
          create: orderItemsData,
        },
      },
    })
  }

  console.log("🔔 Seeding Notifications...")
  const notifications = [
    { title: "Low Stock Warning", content: "SKU: SONYWH1000XM5 has fallen below the minimum stock level of 10. Current quantity: 3." },
    { title: "Order Assigned", content: "Order #2801 was automatically assigned to SupportCopilot for routing checks." },
    { title: "Database Synced", content: "Prisma schema format successfully updated to PostgreSQL driver compliance." },
    { title: "Reconciliation Warning", content: "A mismatch of 2 invoices was detected by accounting agent FinFlow." },
    { title: "Supplier Dispatch", content: "Horizon Tech Wholesalers approved Purchase Order #104. ETA: tomorrow." },
  ]

  for (const n of notifications) {
    const assignedUser = Math.random() > 0.5 ? admin.id : agentSupport.id
    await prisma.notification.create({
      data: {
        userId: assignedUser,
        title: n.title,
        content: n.content,
        isRead: false,
      },
    })
  }

  console.log("🌱 Database seeded successfully!")
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await pool.end()
    await prisma.$disconnect()
  })
