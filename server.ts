import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'seats.db'));

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS seats (
    Seat_ID TEXT PRIMARY KEY,
    Staff_Name TEXT,
    Title TEXT,
    Extension TEXT,
    Port_ID TEXT,
    Network_Jack TEXT,
    Department TEXT,
    Section TEXT,
    Is_Static BOOLEAN DEFAULT 0
  );
  
  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    department TEXT NOT NULL,
    section TEXT NOT NULL,
    color TEXT NOT NULL
  );
`);

// Migration for departments table to add section column if missing
try {
  const info = db.prepare("PRAGMA table_info(departments)").all() as any[];
  const hasSection = info.some(col => col.name === 'section');
  if (!hasSection) {
    console.log('Migrating departments to add section column...');
    db.exec('ALTER TABLE departments ADD COLUMN section TEXT NOT NULL DEFAULT "";');
  }
} catch (e) {
  console.error('Departments migration failed:', e);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS phone_directory_layout (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    column_index INTEGER NOT NULL,
    department TEXT NOT NULL,
    sort_order INTEGER NOT NULL
  );
`);

// Check if we need to migrate from old schema (column_index as PK)
try {
  const info = db.prepare("PRAGMA table_info(phone_directory_layout)").all() as any[];
  const hasId = info.some(col => col.name === 'id');
  if (!hasId) {
    console.log('Migrating phone_directory_layout to new schema...');
    const oldData = db.prepare('SELECT * FROM phone_directory_layout').all() as any[];
    db.exec('DROP TABLE phone_directory_layout');
    db.exec(`
      CREATE TABLE phone_directory_layout (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        column_index INTEGER NOT NULL,
        department TEXT NOT NULL,
        sort_order INTEGER NOT NULL
      )
    `);
    const insert = db.prepare('INSERT INTO phone_directory_layout (column_index, department, sort_order) VALUES (?, ?, ?)');
    oldData.forEach((row, i) => {
      if (row.department) {
        insert.run(row.column_index, row.department, 0);
      }
    });
  }
} catch (e) {
  console.error('Migration failed:', e);
}

try {
  db.exec(`ALTER TABLE seats ADD COLUMN Section TEXT;`);
} catch (e) {
  // Column might already exist
}

// Migration: Move public units to '公共區域'
try {
  const publicUnits = [
    '101會議室', '102會議室', '103會議室', '104會議室', 
    '106會議室', '107會議室', '108多功能會議室', 
    '影印室', '機房', '庫房', '檔案室', '105討論室'
  ];
  const updateStmt = db.prepare("UPDATE seats SET Department = '公共區域' WHERE Seat_ID = ?");
  publicUnits.forEach(id => updateStmt.run(id));
  
  // Also ensure '公共區域' exists in departments table
  const checkDept = db.prepare("SELECT COUNT(*) as count FROM departments WHERE department = '公共區域'").get() as any;
  if (checkDept.count === 0) {
    db.prepare("INSERT INTO departments (department, section, color) VALUES ('公共區域', '', '#94a3b8')").run();
  }
} catch (e) {
  console.error('Public units migration failed:', e);
}

// Initialize with 7 columns if empty
const count = db.prepare('SELECT COUNT(*) as count FROM phone_directory_layout').get() as any;
if (count.count === 0) {
  // We don't need to pre-fill with empty departments anymore, 
  // but we might want to keep the column structure in the UI.
}

const insertSeat = db.prepare(`
  INSERT OR IGNORE INTO seats (Seat_ID, Staff_Name, Title, Extension, Port_ID, Network_Jack, Department, Section, Is_Static)
  VALUES (@Seat_ID, @Staff_Name, @Title, @Extension, @Port_ID, @Network_Jack, @Department, @Section, @Is_Static)
`);

// Initial Data Seeding
const initialData = [
  // 院本部
  { Seat_ID: '101', Staff_Name: '王敏惠', Title: '院長', Extension: '6601', Port_ID: 'P-101', Network_Jack: 'N-101', Department: '', Is_Static: 0 },
  { Seat_ID: '100', Staff_Name: '王時思', Title: '董事長', Extension: '100', Port_ID: 'P-100', Network_Jack: 'N-100', Department: '', Is_Static: 0 },
  { Seat_ID: '102', Staff_Name: '楊中天', Title: '副院長', Extension: '102', Port_ID: 'P-102', Network_Jack: 'N-102', Department: '', Is_Static: 0 },
  { Seat_ID: '103', Staff_Name: '胡婷俐', Title: '副院長', Extension: '103', Port_ID: 'P-103', Network_Jack: 'N-103', Department: '', Is_Static: 0 },

  // 公共區域
  { Seat_ID: '101會議室', Staff_Name: '101會議室', Title: '', Extension: '6601', Port_ID: '', Network_Jack: '', Department: '公共區域', Is_Static: 0 },
  { Seat_ID: '102會議室', Staff_Name: '102會議室', Title: '', Extension: '6602', Port_ID: '', Network_Jack: '', Department: '公共區域', Is_Static: 0 },
  { Seat_ID: '103會議室', Staff_Name: '103會議室', Title: '', Extension: '6603', Port_ID: '', Network_Jack: '', Department: '公共區域', Is_Static: 0 },
  { Seat_ID: '104會議室', Staff_Name: '104會議室', Title: '', Extension: '6609', Port_ID: '', Network_Jack: '', Department: '公共區域', Is_Static: 0 },
  { Seat_ID: '106會議室', Staff_Name: '106會議室', Title: '', Extension: '6606', Port_ID: '', Network_Jack: '', Department: '公共區域', Is_Static: 0 },
  { Seat_ID: '107會議室', Staff_Name: '107會議室', Title: '', Extension: '6607', Port_ID: '', Network_Jack: '', Department: '公共區域', Is_Static: 0 },
  { Seat_ID: '108多功能會議室', Staff_Name: '108多功能會議室', Title: '', Extension: '6608', Port_ID: '', Network_Jack: '', Department: '公共區域', Is_Static: 0 },
  { Seat_ID: '影印室', Staff_Name: '影印室', Title: '', Extension: '', Port_ID: '', Network_Jack: '', Department: '公共區域', Is_Static: 1 },
  { Seat_ID: '機房', Staff_Name: '機房', Extension: '', Port_ID: '', Network_Jack: '', Department: '公共區域', Is_Static: 1 },
  { Seat_ID: '庫房', Staff_Name: '庫房', Extension: '', Port_ID: '', Network_Jack: '', Department: '公共區域', Is_Static: 1 },
  { Seat_ID: '檔案室', Staff_Name: '檔案室', Extension: '', Port_ID: '', Network_Jack: '', Department: '公共區域', Is_Static: 1 },
  { Seat_ID: '112', Staff_Name: '林昀', Extension: '112', Port_ID: 'P-112', Network_Jack: 'N-112', Department: '', Is_Static: 0 },
  { Seat_ID: '109', Staff_Name: '董昱汝', Extension: '109', Port_ID: 'P-109', Network_Jack: 'N-109', Department: '', Is_Static: 0 },
  { Seat_ID: '111', Staff_Name: '楊斯淳', Extension: '111', Port_ID: 'P-111', Network_Jack: 'N-111', Department: '', Is_Static: 0 },
  { Seat_ID: '110', Staff_Name: '徐千惠', Extension: '110', Port_ID: 'P-110', Network_Jack: 'N-110', Department: '', Is_Static: 0 },
  { Seat_ID: '108', Staff_Name: '張聖玉', Extension: '108', Port_ID: 'P-108', Network_Jack: 'N-108', Department: '', Is_Static: 0 },

  // 行政管理處
  { Seat_ID: '602', Staff_Name: '陳佩芝', Extension: '602', Port_ID: 'P-602', Network_Jack: 'N-602', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: '610', Staff_Name: '李佳穗', Extension: '610', Port_ID: 'P-610', Network_Jack: 'N-610', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: '606', Staff_Name: '江惠真', Extension: '606', Port_ID: 'P-606', Network_Jack: 'N-606', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: '605', Staff_Name: '江晶瑩', Extension: '605', Port_ID: 'P-605', Network_Jack: 'N-605', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: '603', Staff_Name: '周君霖', Extension: '603', Port_ID: 'P-603', Network_Jack: 'N-603', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: '625', Staff_Name: '劉恒嘉', Extension: '625', Port_ID: 'P-625', Network_Jack: 'N-625', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: '616', Staff_Name: '羅茹珊', Extension: '616', Port_ID: 'P-616', Network_Jack: 'N-616', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: '607', Staff_Name: '待補入', Extension: '607', Port_ID: 'P-607', Network_Jack: 'N-607', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: '613', Staff_Name: '待補入', Extension: '613', Port_ID: 'P-613', Network_Jack: 'N-613', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: '609', Staff_Name: '蔡維仁', Extension: '609', Port_ID: 'P-609', Network_Jack: 'N-609', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: '612', Staff_Name: '廖韋欣', Extension: '612', Port_ID: 'P-612', Network_Jack: 'N-612', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: '622', Staff_Name: '賴奇妨', Extension: '622', Port_ID: 'P-622', Network_Jack: 'N-622', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: '608', Staff_Name: '胡岑卉', Extension: '608', Port_ID: 'P-608', Network_Jack: 'N-608', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: '617', Staff_Name: '鄭國宏', Extension: '617', Port_ID: 'P-617', Network_Jack: 'N-617', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: '615', Staff_Name: '吳宸宇', Extension: '615', Port_ID: 'P-615', Network_Jack: 'N-615', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: '623', Staff_Name: '許紫榆', Extension: '623', Port_ID: 'P-623', Network_Jack: 'N-623', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: '619', Staff_Name: '張元馨', Extension: '619', Port_ID: 'P-619', Network_Jack: 'N-619', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: '618', Staff_Name: '江良健', Extension: '618', Port_ID: 'P-618', Network_Jack: 'N-618', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: '611', Staff_Name: '鍾永強', Extension: '611', Port_ID: 'P-611', Network_Jack: 'N-611', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: '621', Staff_Name: '陳佳欣', Extension: '621', Port_ID: 'P-621', Network_Jack: 'N-621', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: '620', Staff_Name: '謝竹婷', Extension: '620', Port_ID: 'P-620', Network_Jack: 'N-620', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: '150', Staff_Name: '張文櫻', Extension: '150', Port_ID: 'P-150', Network_Jack: 'N-150', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: '601', Staff_Name: '葉敏慧', Extension: '601', Port_ID: 'P-601', Network_Jack: 'N-601', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: 'E-Col5-1', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: 'E-Col5-2', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: 'E-Col5-3', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: 'E-Col5-4', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: 'E623-1', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: 'E623-2', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: 'E618-1', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: 'E618-2', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '行政管理處', Is_Static: 0 },
  { Seat_ID: '105討論室', Staff_Name: '會議室', Title: '', Extension: '6605', Port_ID: '', Network_Jack: '', Department: '公共區域', Is_Static: 0 },

  // 文化金融處
  { Seat_ID: '201', Staff_Name: '丁心雅', Extension: '201', Port_ID: 'P-201', Network_Jack: 'N-201', Department: '文化金融處', Is_Static: 0 },
  { Seat_ID: '116', Staff_Name: '李又芳', Extension: '116', Port_ID: 'P-116', Network_Jack: 'N-116', Department: '文化金融處', Is_Static: 0 },
  { Seat_ID: '213', Staff_Name: '王朝民', Extension: '213', Port_ID: 'P-213', Network_Jack: 'N-213', Department: '文化金融處', Is_Static: 0 },
  { Seat_ID: '251', Staff_Name: '袁文蘭', Extension: '251', Port_ID: 'P-251', Network_Jack: 'N-251', Department: '文化金融處', Is_Static: 0 },
  { Seat_ID: '227', Staff_Name: '鄭人之', Extension: '227', Port_ID: 'P-227', Network_Jack: 'N-227', Department: '文化金融處', Is_Static: 0 },
  { Seat_ID: '203', Staff_Name: '賴麗娟', Extension: '203', Port_ID: 'P-203', Network_Jack: 'N-203', Department: '文化金融處', Is_Static: 0 },
  { Seat_ID: '208', Staff_Name: '周芷萱', Extension: '208', Port_ID: 'P-208', Network_Jack: 'N-208', Department: '文化金融處', Is_Static: 0 },
  { Seat_ID: '255', Staff_Name: '李育瑄', Extension: '255', Port_ID: 'P-255', Network_Jack: 'N-255', Department: '文化金融處', Is_Static: 0 },
  { Seat_ID: '228', Staff_Name: '黃資棻', Extension: '228', Port_ID: 'P-228', Network_Jack: 'N-228', Department: '文化金融處', Is_Static: 0 },
  { Seat_ID: '222', Staff_Name: '劉千綾', Extension: '222', Port_ID: 'P-222', Network_Jack: 'N-222', Department: '文化金融處', Is_Static: 0 },
  { Seat_ID: '220', Staff_Name: '姜坤佩', Extension: '220', Port_ID: 'P-220', Network_Jack: 'N-220', Department: '文化金融處', Is_Static: 0 },
  { Seat_ID: '253', Staff_Name: '黃湛', Extension: '253', Port_ID: 'P-253', Network_Jack: 'N-253', Department: '文化金融處', Is_Static: 0 },
  { Seat_ID: '207', Staff_Name: '董佩宜', Extension: '207', Port_ID: 'P-207', Network_Jack: 'N-207', Department: '文化金融處', Is_Static: 0 },
  { Seat_ID: '206', Staff_Name: '蘇奕維', Extension: '206', Port_ID: 'P-206', Network_Jack: 'N-206', Department: '文化金融處', Is_Static: 0 },
  { Seat_ID: '252', Staff_Name: '邱博敬', Extension: '252', Port_ID: 'P-252', Network_Jack: 'N-252', Department: '文化金融處', Is_Static: 0 },
  { Seat_ID: '211', Staff_Name: '許可淳', Extension: '211', Port_ID: 'P-211', Network_Jack: 'N-211', Department: '文化金融處', Is_Static: 0 },
  { Seat_ID: '210', Staff_Name: '宋嘉修', Extension: '210', Port_ID: 'P-210', Network_Jack: 'N-210', Department: '文化金融處', Is_Static: 0 },
  { Seat_ID: '219', Staff_Name: '李沛芳', Extension: '219', Port_ID: 'P-219', Network_Jack: 'N-219', Department: '文化金融處', Is_Static: 0 },
  { Seat_ID: '209', Staff_Name: '林意涵', Extension: '209', Port_ID: 'P-209', Network_Jack: 'N-209', Department: '文化金融處', Is_Static: 0 },
  { Seat_ID: '216', Staff_Name: '王兆毅', Extension: '216', Port_ID: 'P-216', Network_Jack: 'N-216', Department: '文化金融處', Is_Static: 0 },
  { Seat_ID: '217', Staff_Name: '林育慈', Extension: '217', Port_ID: 'P-217', Network_Jack: 'N-217', Department: '文化金融處', Is_Static: 0 },
  { Seat_ID: '215', Staff_Name: '蔡佩宜', Extension: '215', Port_ID: 'P-215', Network_Jack: 'N-215', Department: '文化金融處', Is_Static: 0 },
  { Seat_ID: '212', Staff_Name: '郭倚文', Extension: '212', Port_ID: 'P-212', Network_Jack: 'N-212', Department: '文化金融處', Is_Static: 0 },
  { Seat_ID: '221', Staff_Name: '王沛貽', Extension: '221', Port_ID: 'P-221', Network_Jack: 'N-221', Department: '文化金融處', Is_Static: 0 },
  { Seat_ID: '205', Staff_Name: '黃永芳', Extension: '205', Port_ID: 'P-205', Network_Jack: 'N-205', Department: '文化金融處', Is_Static: 0 },

  // 法務室
  { Seat_ID: '115', Staff_Name: '謝家禾', Extension: '115', Port_ID: 'P-115', Network_Jack: 'N-115', Department: '法務室', Is_Static: 0 },
  { Seat_ID: '130', Staff_Name: '葉子豪', Extension: '130', Port_ID: 'P-130', Network_Jack: 'N-130', Department: '法務室', Is_Static: 0 },
  { Seat_ID: '128', Staff_Name: '黃于恩', Extension: '128', Port_ID: 'P-128', Network_Jack: 'N-128', Department: '法務室', Is_Static: 0 },
  { Seat_ID: '125', Staff_Name: '林容琦', Extension: '125', Port_ID: 'P-125', Network_Jack: 'N-125', Department: '法務室', Is_Static: 0 },
  { Seat_ID: '121', Staff_Name: '許傳毅', Extension: '121', Port_ID: 'P-121', Network_Jack: 'N-121', Department: '法務室', Is_Static: 0 },
  { Seat_ID: '127', Staff_Name: '孫立璿', Extension: '127', Port_ID: 'P-127', Network_Jack: 'N-127', Department: '法務室', Is_Static: 0 },
  { Seat_ID: '126', Staff_Name: '賴怡東', Extension: '126', Port_ID: 'P-126', Network_Jack: 'N-126', Department: '法務室', Is_Static: 0 },
  { Seat_ID: '123', Staff_Name: '蔡瑛鎂', Extension: '123', Port_ID: 'P-123', Network_Jack: 'N-123', Department: '法務室', Is_Static: 0 },

  // ESG影響力中心
  { Seat_ID: '113', Staff_Name: '林雨欣', Extension: '113', Port_ID: 'P-113', Network_Jack: 'N-113', Department: 'ESG影響力中心', Is_Static: 0 },
  { Seat_ID: '738', Staff_Name: '蔡佩妤', Extension: '738', Port_ID: 'P-738', Network_Jack: 'N-738', Department: 'ESG影響力中心', Is_Static: 0 },
  { Seat_ID: '719', Staff_Name: '王君盈', Extension: '719', Port_ID: 'P-719', Network_Jack: 'N-719', Department: 'ESG影響力中心', Is_Static: 0 },
  { Seat_ID: '725', Staff_Name: '蔡佳蓁', Extension: '725', Port_ID: 'P-725', Network_Jack: 'N-725', Department: 'ESG影響力中心', Is_Static: 0 },
  { Seat_ID: '721', Staff_Name: '王詩情', Extension: '721', Port_ID: 'P-721', Network_Jack: 'N-721', Department: 'ESG影響力中心', Is_Static: 0 },

  // 策略研究處
  { Seat_ID: '701', Staff_Name: '林喜雯', Extension: '701', Port_ID: 'P-701', Network_Jack: 'N-701', Department: '策略研究處', Is_Static: 0 },
  { Seat_ID: '710', Staff_Name: '李昀', Extension: '710', Port_ID: 'P-710', Network_Jack: 'N-710', Department: '策略研究處', Is_Static: 0 },
  { Seat_ID: '712', Staff_Name: '康惠娟', Extension: '712', Port_ID: 'P-712', Network_Jack: 'N-712', Department: '策略研究處', Is_Static: 0 },
  { Seat_ID: '717', Staff_Name: '廖容慈', Extension: '717', Port_ID: 'P-717', Network_Jack: 'N-717', Department: '策略研究處', Is_Static: 0 },
  { Seat_ID: '736', Staff_Name: '王郁惠', Extension: '736', Port_ID: 'P-736', Network_Jack: 'N-736', Department: '策略研究處', Is_Static: 0 },
  { Seat_ID: '715', Staff_Name: '鄭如軒', Extension: '715', Port_ID: 'P-715', Network_Jack: 'N-715', Department: '策略研究處', Is_Static: 0 },
  { Seat_ID: '737', Staff_Name: '呂季芸', Extension: '737', Port_ID: 'P-737', Network_Jack: 'N-737', Department: '策略研究處', Is_Static: 0 },
  { Seat_ID: '720', Staff_Name: '陳偉銘', Extension: '720', Port_ID: 'P-720', Network_Jack: 'N-720', Department: '策略研究處', Is_Static: 0 },
  { Seat_ID: '750', Staff_Name: '鄭人豪', Extension: '750', Port_ID: 'P-750', Network_Jack: 'N-750', Department: '策略研究處', Is_Static: 0 },
  { Seat_ID: '722', Staff_Name: '林美伶', Extension: '722', Port_ID: 'P-722', Network_Jack: 'N-722', Department: '策略研究處', Is_Static: 0 },
  { Seat_ID: '735', Staff_Name: '周佳慧', Extension: '735', Port_ID: 'P-735', Network_Jack: 'N-735', Department: '策略研究處', Is_Static: 0 },
  { Seat_ID: '709', Staff_Name: '蔡馨儀', Extension: '709', Port_ID: 'P-709', Network_Jack: 'N-709', Department: '策略研究處', Is_Static: 0 },
  { Seat_ID: '706', Staff_Name: '蔡郁崇', Extension: '706', Port_ID: 'P-706', Network_Jack: 'N-706', Department: '策略研究處', Is_Static: 0 },
  { Seat_ID: '751', Staff_Name: '蕭亦庭', Extension: '751', Port_ID: 'P-751', Network_Jack: 'N-751', Department: '策略研究處', Is_Static: 0 },
  { Seat_ID: '705', Staff_Name: '洪婉馨', Extension: '705', Port_ID: 'P-705', Network_Jack: 'N-705', Department: '策略研究處', Is_Static: 0 },
  { Seat_ID: '711', Staff_Name: '王紀澤', Extension: '711', Port_ID: 'P-711', Network_Jack: 'N-711', Department: '策略研究處', Is_Static: 0 },
  { Seat_ID: '729', Staff_Name: '陳艾敏', Extension: '729', Port_ID: 'P-729', Network_Jack: 'N-729', Department: '策略研究處', Is_Static: 0 },
  { Seat_ID: '731', Staff_Name: '蔡子殷', Extension: '731', Port_ID: 'P-731', Network_Jack: 'N-731', Department: '策略研究處', Is_Static: 0 },
  { Seat_ID: '728', Staff_Name: '章詠毓', Extension: '728', Port_ID: 'P-728', Network_Jack: 'N-728', Department: '策略研究處', Is_Static: 0 },
  { Seat_ID: '716', Staff_Name: '朱修宏', Extension: '716', Port_ID: 'P-716', Network_Jack: 'N-716', Department: '策略研究處', Is_Static: 0 },

  // 全球市場處
  { Seat_ID: '501', Staff_Name: '待補入', Extension: '501', Port_ID: 'P-501', Network_Jack: 'N-501', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '507', Staff_Name: '呂淑綿', Extension: '507', Port_ID: 'P-507', Network_Jack: 'N-507', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '539', Staff_Name: '鄧信徹', Extension: '539', Port_ID: 'P-539', Network_Jack: 'N-539', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '505', Staff_Name: '黃俊華', Extension: '505', Port_ID: 'P-505', Network_Jack: 'N-505', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '523', Staff_Name: '陸子玲', Extension: '523', Port_ID: 'P-523', Network_Jack: 'N-523', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '559', Staff_Name: '曹淯安', Extension: '559', Port_ID: 'P-559', Network_Jack: 'N-559', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '517', Staff_Name: '林侃歷', Extension: '517', Port_ID: 'P-517', Network_Jack: 'N-517', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '511', Staff_Name: '李湘嵐', Extension: '511', Port_ID: 'P-511', Network_Jack: 'N-511', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '519', Staff_Name: '楊先妤', Extension: '519', Port_ID: 'P-519', Network_Jack: 'N-519', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '512', Staff_Name: '林杰', Extension: '512', Port_ID: 'P-512', Network_Jack: 'N-512', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '526', Staff_Name: '彭俊陵', Extension: '526', Port_ID: 'P-526', Network_Jack: 'N-526', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '557', Staff_Name: '楊冀臨', Extension: '557', Port_ID: 'P-557', Network_Jack: 'N-557', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '502', Staff_Name: '吳翔宇', Extension: '502', Port_ID: 'P-502', Network_Jack: 'N-502', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '521', Staff_Name: '李衣晴', Extension: '521', Port_ID: 'P-521', Network_Jack: 'N-521', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '510', Staff_Name: '劉孟穎', Extension: '510', Port_ID: 'P-510', Network_Jack: 'N-510', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '503', Staff_Name: '陳亭羽', Extension: '503', Port_ID: 'P-503', Network_Jack: 'N-503', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '525', Staff_Name: '許雨婷', Extension: '525', Port_ID: 'P-525', Network_Jack: 'N-525', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '558', Staff_Name: '徐烱宙', Extension: '558', Port_ID: 'P-558', Network_Jack: 'N-558', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '528', Staff_Name: '王昱淳', Extension: '528', Port_ID: 'P-528', Network_Jack: 'N-528', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '522', Staff_Name: '徐菱', Extension: '522', Port_ID: 'P-522', Network_Jack: 'N-522', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '516', Staff_Name: '徐佳鈴', Extension: '516', Port_ID: 'P-516', Network_Jack: 'N-516', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '550', Staff_Name: '張嘉軒', Extension: '550', Port_ID: 'P-550', Network_Jack: 'N-550', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '551', Staff_Name: '晉安佐', Extension: '551', Port_ID: 'P-551', Network_Jack: 'N-551', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '533', Staff_Name: '李慧淩', Extension: '533', Port_ID: 'P-533', Network_Jack: 'N-533', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '527', Staff_Name: '林敬凱', Extension: '527', Port_ID: 'P-527', Network_Jack: 'N-527', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '537', Staff_Name: '江慧榆', Extension: '537', Port_ID: 'P-537', Network_Jack: 'N-537', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '538', Staff_Name: '張永惟', Extension: '538', Port_ID: 'P-538', Network_Jack: 'N-538', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '556', Staff_Name: '吳彥嫻', Extension: '556', Port_ID: 'P-556', Network_Jack: 'N-556', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '529', Staff_Name: '周筱琦', Extension: '529', Port_ID: 'P-529', Network_Jack: 'N-529', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '506', Staff_Name: '林雨靜', Extension: '506', Port_ID: 'P-506', Network_Jack: 'N-506', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '530', Staff_Name: '林明瑩', Extension: '530', Port_ID: 'P-530', Network_Jack: 'N-530', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '531', Staff_Name: '蔡惠茹', Extension: '531', Port_ID: 'P-531', Network_Jack: 'N-531', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '553', Staff_Name: '嚴睿淇', Extension: '553', Port_ID: 'P-553', Network_Jack: 'N-553', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: 'E516-1', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: 'E550-1', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: 'E551-1', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: 'E533-1', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: 'E529-1', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '822', Staff_Name: '胡文嘉', Extension: '822', Port_ID: 'P-822', Network_Jack: 'N-822', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '120', Staff_Name: 'MICOL, JEAN-ROMAIN', Extension: '120', Port_ID: 'P-120', Network_Jack: 'N-120', Department: '全球市場處', Is_Static: 0 },
  { Seat_ID: '801', Staff_Name: '吳御曄', Extension: '801', Port_ID: 'P-801', Network_Jack: 'N-801', Department: '全球市場處', Is_Static: 0 },

  // 公共關係室
  { Seat_ID: '809', Staff_Name: '陳昱勲', Extension: '809', Port_ID: 'P-809', Network_Jack: 'N-809', Department: '公共關係室', Is_Static: 0 },
  { Seat_ID: '832', Staff_Name: '劉子榮', Extension: '832', Port_ID: 'P-832', Network_Jack: 'N-832', Department: '公共關係室', Is_Static: 0 },
  { Seat_ID: '807', Staff_Name: '林怡君', Extension: '807', Port_ID: 'P-807', Network_Jack: 'N-807', Department: '公共關係室', Is_Static: 0 },
  { Seat_ID: '810', Staff_Name: '鄭伊庭', Extension: '810', Port_ID: 'P-810', Network_Jack: 'N-810', Department: '公共關係室', Is_Static: 0 },
  { Seat_ID: '805', Staff_Name: '李嘉欣', Extension: '805', Port_ID: 'P-805', Network_Jack: 'N-805', Department: '公共關係室', Is_Static: 0 },
  { Seat_ID: '803', Staff_Name: '楊子鋒', Extension: '803', Port_ID: 'P-803', Network_Jack: 'N-803', Department: '公共關係室', Is_Static: 0 },
  { Seat_ID: 'E-PR-1', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '公共關係室', Is_Static: 0 },
  { Seat_ID: 'E-PR-2', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '公共關係室', Is_Static: 0 },

  // 院本部
  { Seat_ID: 'E-HQ-1', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '', Is_Static: 0 },
  { Seat_ID: 'E-HQ-2', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '', Is_Static: 0 },
  { Seat_ID: 'E-HQ-3', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '', Is_Static: 0 },
  { Seat_ID: 'E-HQ-4', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '', Is_Static: 0 },
  { Seat_ID: 'E-HQ-5', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '', Is_Static: 0 },
  { Seat_ID: 'E-HQ-6', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '', Is_Static: 0 },
  { Seat_ID: 'E-HQ-7', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '', Is_Static: 0 },
  { Seat_ID: 'E-HQ-8', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '', Is_Static: 0 },
  { Seat_ID: 'E-HQ-9', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '', Is_Static: 0 },
  { Seat_ID: 'E-HQ-10', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '', Is_Static: 0 },
  { Seat_ID: 'E-HQ-11', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '', Is_Static: 0 },
  { Seat_ID: 'E-HQ-12', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '', Is_Static: 0 },
  { Seat_ID: 'E-HQ-13', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '', Is_Static: 0 },
  { Seat_ID: 'E-HQ-14', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '', Is_Static: 0 },
  { Seat_ID: 'E-HQ-15', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '', Is_Static: 0 },
  { Seat_ID: 'E-HQ-16', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '', Is_Static: 0 },
  { Seat_ID: '713', Staff_Name: '黃育千', Extension: '713', Port_ID: 'P-713', Network_Jack: 'N-713', Department: '協力工作區', Is_Static: 0 },
  { Seat_ID: '235', Staff_Name: '王姿婷', Extension: '235', Port_ID: 'P-235', Network_Jack: 'N-235', Department: '協力工作區', Is_Static: 0 },
  { Seat_ID: '518', Staff_Name: '陳昕妤', Extension: '518', Port_ID: 'P-518', Network_Jack: 'N-518', Department: '協力工作區', Is_Static: 0 },
  { Seat_ID: '831', Staff_Name: '林韋伶', Extension: '831', Port_ID: 'P-831', Network_Jack: 'N-831', Department: '協力工作區', Is_Static: 0 },
  { Seat_ID: '236', Staff_Name: '洪莛媗', Extension: '236', Port_ID: 'P-236', Network_Jack: 'N-236', Department: '協力工作區', Is_Static: 0 },
  { Seat_ID: '232', Staff_Name: '楊詒婷', Extension: '232', Port_ID: 'P-232', Network_Jack: 'N-232', Department: '協力工作區', Is_Static: 0 },
  { Seat_ID: '231', Staff_Name: '古敏怡', Extension: '231', Port_ID: 'P-231', Network_Jack: 'N-231', Department: '協力工作區', Is_Static: 0 },
  { Seat_ID: '233', Staff_Name: '黃珮珺', Extension: '233', Port_ID: 'P-233', Network_Jack: 'N-233', Department: '協力工作區', Is_Static: 0 },

  // 財務室
  { Seat_ID: '811', Staff_Name: '林淑瑋', Extension: '811', Port_ID: 'P-811', Network_Jack: 'N-811', Department: '財務室', Is_Static: 0 },
  { Seat_ID: '812', Staff_Name: '吳鍚和', Extension: '812', Port_ID: 'P-812', Network_Jack: 'N-812', Department: '財務室', Is_Static: 0 },
  { Seat_ID: '813', Staff_Name: '李志淳', Extension: '813', Port_ID: 'P-813', Network_Jack: 'N-813', Department: '財務室', Is_Static: 0 },
  { Seat_ID: '815', Staff_Name: '邱筱涵', Extension: '815', Port_ID: 'P-815', Network_Jack: 'N-815', Department: '財務室', Is_Static: 0 },
  { Seat_ID: '816', Staff_Name: '林亮玓', Extension: '816', Port_ID: 'P-816', Network_Jack: 'N-816', Department: '財務室', Is_Static: 0 },
  { Seat_ID: '819', Staff_Name: '李美樺', Extension: '819', Port_ID: 'P-819', Network_Jack: 'N-819', Department: '財務室', Is_Static: 0 },
  { Seat_ID: '818', Staff_Name: '林芳燕', Extension: '818', Port_ID: 'P-818', Network_Jack: 'N-818', Department: '財務室', Is_Static: 0 },

  // 內容策進處
  { Seat_ID: '305', Staff_Name: '張綺芬', Extension: '305', Port_ID: 'P-305', Network_Jack: 'N-305', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '309', Staff_Name: '許世佳', Extension: '309', Port_ID: 'P-309', Network_Jack: 'N-309', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '328', Staff_Name: '許心怡', Extension: '328', Port_ID: 'P-328', Network_Jack: 'N-328', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '333', Staff_Name: '李明潔', Extension: '333', Port_ID: 'P-333', Network_Jack: 'N-333', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '381', Staff_Name: '張茵媫', Extension: '381', Port_ID: 'P-381', Network_Jack: 'N-381', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '339', Staff_Name: '趙婉君', Extension: '339', Port_ID: 'P-339', Network_Jack: 'N-339', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '303', Staff_Name: '蘇韋菁', Extension: '303', Port_ID: 'P-303', Network_Jack: 'N-303', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '311', Staff_Name: '劉巧敏', Extension: '311', Port_ID: 'P-311', Network_Jack: 'N-311', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '307', Staff_Name: '楊秉銓', Extension: '307', Port_ID: 'P-307', Network_Jack: 'N-307', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '332', Staff_Name: '吳宛馨', Extension: '332', Port_ID: 'P-332', Network_Jack: 'N-332', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '310', Staff_Name: '溫淳雅', Extension: '310', Port_ID: 'P-310', Network_Jack: 'N-310', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '3936', Staff_Name: '王逸', Extension: '3936', Port_ID: 'P-3936', Network_Jack: 'N-3936', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '380', Staff_Name: '林珮菱', Extension: '380', Port_ID: 'P-380', Network_Jack: 'N-380', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '317', Staff_Name: '翁嘉翊', Extension: '317', Port_ID: 'P-317', Network_Jack: 'N-317', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '369', Staff_Name: '吳欣蕙', Extension: '369', Port_ID: 'P-369', Network_Jack: 'N-369', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '306', Staff_Name: '蔡明璁', Extension: '306', Port_ID: 'P-306', Network_Jack: 'N-306', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '329', Staff_Name: '殷珮瑜', Extension: '329', Port_ID: 'P-329', Network_Jack: 'N-329', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '3932', Staff_Name: '林宜柔', Extension: '3932', Port_ID: 'P-3932', Network_Jack: 'N-3932', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '3935', Staff_Name: '張祐玟', Extension: '3935', Port_ID: 'P-3935', Network_Jack: 'N-3935', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '320', Staff_Name: '陳俞廷', Extension: '320', Port_ID: 'P-320', Network_Jack: 'N-320', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '313', Staff_Name: '林佩函', Extension: '313', Port_ID: 'P-313', Network_Jack: 'N-313', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '308', Staff_Name: '謝宜廷', Extension: '308', Port_ID: 'P-308', Network_Jack: 'N-308', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '350', Staff_Name: '王華翰', Extension: '350', Port_ID: 'P-350', Network_Jack: 'N-350', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '331', Staff_Name: '朱宗乙', Extension: '331', Port_ID: 'P-331', Network_Jack: 'N-331', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '325', Staff_Name: '張育甄', Extension: '325', Port_ID: 'P-325', Network_Jack: 'N-325', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '3931', Staff_Name: '任容', Extension: '3931', Port_ID: 'P-3931', Network_Jack: 'N-3931', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '383', Staff_Name: '彭示馨', Extension: '383', Port_ID: 'P-383', Network_Jack: 'N-383', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '323', Staff_Name: '楊哲維', Extension: '323', Port_ID: 'P-323', Network_Jack: 'N-323', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '319', Staff_Name: '陳宇蓮', Extension: '319', Port_ID: 'P-319', Network_Jack: 'N-319', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '382', Staff_Name: '徐翎庭', Extension: '382', Port_ID: 'P-382', Network_Jack: 'N-382', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '322', Staff_Name: '許瑜珊', Extension: '322', Port_ID: 'P-322', Network_Jack: 'N-322', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '435', Staff_Name: '李恩', Extension: '435', Port_ID: 'P-435', Network_Jack: 'N-435', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '384', Staff_Name: '張倢菱', Extension: '384', Port_ID: 'P-384', Network_Jack: 'N-384', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '315', Staff_Name: '詹子儀', Extension: '315', Port_ID: 'P-315', Network_Jack: 'N-315', Department: '內容策進處', Is_Static: 0 },
  { Seat_ID: '330', Staff_Name: '陳德融', Extension: '330', Port_ID: 'P-330', Network_Jack: 'N-330', Department: '內容策進處', Is_Static: 0 },

  // 南部營運中心
  { Seat_ID: '4001', Staff_Name: '吳商平', Title: '主任', Extension: '4001', Port_ID: 'P-4001', Network_Jack: 'N-4001', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: '4005', Staff_Name: '何俊穆', Extension: '4005', Port_ID: 'P-4005', Network_Jack: 'N-4005', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: '4003', Staff_Name: '林欣頤', Extension: '4003', Port_ID: 'P-4003', Network_Jack: 'N-4003', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: '4021', Staff_Name: '宋明翰', Extension: '4021', Port_ID: 'P-4021', Network_Jack: 'N-4021', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: '4006', Staff_Name: '李佳蓉', Extension: '4006', Port_ID: 'P-4006', Network_Jack: 'N-4006', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: '4020', Staff_Name: '會議室', Extension: '4020', Port_ID: '', Network_Jack: '', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: 'S2', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: 'S3', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: 'S4', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: 'S6', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: 'S7', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: 'S9', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: 'S10', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: 'S11', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: 'S12', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: 'S13', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: 'S14', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: 'S15', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: 'S16', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: 'S17', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: 'S18', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: 'S19', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: 'S20', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: 'S21', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: 'S22', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: 'S23', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: 'S24', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: 'S25', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: 'S26', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: 'S27', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: 'S28', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '南部營運中心', Is_Static: 0 },
  { Seat_ID: 'S29', Staff_Name: '待補入', Extension: '', Port_ID: '', Network_Jack: '', Department: '南部營運中心', Is_Static: 0 },
];

const insertMany = db.transaction((seats) => {
  for (const seat of seats) {
    insertSeat.run({
      ...seat,
      Title: seat.Title || '',
      Section: seat.Section || ''
    });
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  app.use(express.json());

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`App Version: 1.2.0 (UI Update Verification)`);
    
    // Seed initial data in the background after server starts
    try {
      insertMany(initialData);
      console.log('Initial data seeding completed');
    } catch (e) {
      console.error('Initial data seeding failed:', e);
    }
  });
}

startServer();
