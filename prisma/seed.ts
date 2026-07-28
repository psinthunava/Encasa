import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL })
const prisma = new PrismaClient({ adapter })

const DEFAULT_CATEGORIES: { name: string; subcategories: string[] }[] = [
  {
    name: 'Utilities',
    subcategories: ['Electricity', 'Water', 'Sewer', 'Garbage', 'Gas', 'Internet', 'Solar', 'HOA Utilities'],
  },
  {
    name: 'Food',
    subcategories: ['Costco', 'Walmart', 'Grocery', 'Restaurant', 'Take Out'],
  },
  {
    name: 'Cleaning',
    subcategories: ['Laundry', 'Supplies', 'Vacuum', 'Paper Towels'],
  },
  { name: 'House Supplies', subcategories: [] },
  { name: 'Maintenance', subcategories: [] },
  { name: 'Repairs', subcategories: [] },
  { name: 'Streaming', subcategories: [] },
  { name: 'Insurance', subcategories: [] },
  { name: 'Rent', subcategories: [] },
  { name: 'Parking', subcategories: [] },
  { name: 'Pet', subcategories: [] },
  { name: 'Medical', subcategories: [] },
  { name: 'Children', subcategories: [] },
  { name: 'Transportation', subcategories: [] },
  { name: 'Miscellaneous', subcategories: [] },
]

async function main() {
  const existing = await prisma.household.findFirst()
  if (existing) {
    console.log(`Household already exists (${existing.name}), skipping seed.`)
    return
  }

  const household = await prisma.household.create({
    data: {
      name: 'Encasa Household Expenses',
      families: {
        create: [{ name: 'Sinthunava' }, { name: 'Junya' }],
      },
    },
  })
  console.log(`Created household: ${household.name}`)

  for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
    const cat = DEFAULT_CATEGORIES[i]
    await prisma.category.create({
      data: {
        householdId: household.id,
        name: cat.name,
        sortOrder: i,
        subcategories: {
          create: cat.subcategories.map((name, j) => ({ name, sortOrder: j })),
        },
      },
    })
  }
  console.log(`Created ${DEFAULT_CATEGORIES.length} default categories.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
