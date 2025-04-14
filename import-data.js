const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function clearDatabase() {
  // Desabilitar temporariamente as foreign key constraints
  await prisma.$executeRaw`SET session_replication_role = 'replica';`;

  const tables = [
    'Response',
    'Option',
    'StageQuestion',
    'Question',
    'TestStage',
    'Candidate',
    'Stage',
    'tests',
    'Category',
    'Admin',
    'User',
    'UsedInviteCode'
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
      console.log(`Cleared table ${table}`);
    } catch (err) {
      console.error(`Error clearing table ${table}:`, err.message);
    }
  }

  // Reabilitar as foreign key constraints
  await prisma.$executeRaw`SET session_replication_role = 'origin';`;
}

async function importData() {
  try {
    await clearDatabase();

    const backupContent = fs.readFileSync('./exports/avaliarh_export_2025-03-09T20-50-10-129Z.sql', 'utf8');
    const lines = backupContent.split('\n');
    
    // Ordem de importação para respeitar as foreign keys
    const importOrder = [
      'User', 'Admin', 'Category', 'tests', 'Stage', 'TestStage',
      'Question', 'Option', 'Candidate', 'Response', 'UsedInviteCode'
    ];

    const allData = new Map();

    // Primeiro, colete todos os dados
    for (const line of lines) {
      if (line.startsWith('INSERT INTO')) {
        const match = line.match(/INSERT INTO "(\w+)"/);
        if (match) {
          const table = match[1];
          const dataMatch = line.match(/VALUES \((.*?)\);/);
          if (dataMatch) {
            if (!allData.has(table)) {
              allData.set(table, []);
            }

            const values = dataMatch[1].split(',').map(v => {
              v = v.trim();
              if (v === 'NULL') return null;
              if (v === 'TRUE') return true;
              if (v === 'FALSE') return false;
              if (v.startsWith("'") && v.endsWith("'")) {
                return v.slice(1, -1);
              }
              return v;
            });

            const data = {};
            const columns = line.match(/\((.*?)\) VALUES/)[1].split(',').map(c => c.trim().replace(/"/g, ''));
            
            columns.forEach((col, i) => {
              let value = values[i];
              if (value === null) return;

              // Converter tipos de dados
              if (col === 'order' || col === 'timeLimit' || col === 'inviteAttempts') {
                value = parseInt(value, 10) || 0;
              } else if (col === 'rating') {
                value = parseFloat(value) || null;
              } else if (value && (col.includes('At') || col.includes('Date'))) {
                value = new Date(value.replace(/'/g, ''));
              }

              data[col] = value;
            });

            // Special handling for 'bank-questions-stage'
            if (table === 'Stage' && data.id === 'bank-questions-stage') {
              data.id = '00000000-0000-0000-0000-000000000000';
            }

            // Garantir que todos os IDs sejam strings válidas
            if (data.id && typeof data.id === 'string') {
              data.id = data.id.trim();
            }

            allData.get(table).push(data);
          }
        }
      }
    }

    // Desabilitar temporariamente as foreign key constraints para importação
    await prisma.$executeRaw`SET session_replication_role = 'replica';`;

    try {
      // Depois, importe na ordem correta
      for (const tableName of importOrder) {
        const tableData = allData.get(tableName);
        if (!tableData) continue;

        console.log(`Importing ${tableName}...`);
        for (const data of tableData) {
          try {
            const modelName = tableName.toLowerCase();
            if (prisma[modelName]) {
              await prisma[modelName].create({
                data: {
                  ...data,
                  // Garantir que as datas sejam válidas
                  createdAt: data.createdAt || new Date(),
                  updatedAt: data.updatedAt || new Date()
                }
              });
              console.log(`Inserted record in ${tableName}`);
            }
          } catch (err) {
            console.error(`Error inserting into ${tableName}:`, err.message);
            console.error('Data:', JSON.stringify(data, null, 2));
          }
        }
      }
    } finally {
      // Reabilitar as foreign key constraints
      await prisma.$executeRaw`SET session_replication_role = 'origin';`;
    }
    
    console.log('Data import completed');
  } catch (err) {
    console.error('Error importing data:', err);
  } finally {
    await prisma.$disconnect();
  }
}

importData();
