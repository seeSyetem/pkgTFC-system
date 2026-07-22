/**
 * ระบบจัดการหน่วยแพ็คกิ้ง v1.0 - Backend Core
 

function doGet() {
  return HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle("ระบบจัดการหน่วยแพ็คกิ้ง v1.0")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService
    .createHtmlOutputFromFile(filename)
    .getContent();
}

// ==========================================
// 1. ระบบจัดการข้อมูลแบบ CRUD (รองรับทุกชีต)
// ==========================================
function manageInventoryAndItems(action, sheetName, rowData, rowIndex) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, message: "ไม่พบแท็บข้อมูล: " + sheetName };                                                                                              

    if (action === "ADD") {
      sheet.appendRow(rowData);
      return { success: true, message: "✅ บันทึกข้อมูลสำเร็จ" };
    } 
    else if (action === "EDIT" && rowIndex > 0) {
      // อัปเดตข้อมูล โดยรักษา ID เดิมในคอลัมน์ A (index 0)
      var range = sheet.getRange(rowIndex, 1, 1, rowData.length);
      range.setValues([rowData]);
      return { success: true, message: "✏️ แก้ไขข้อมูลสำเร็จ" };
    } 
    else if (action === "DELETE" && rowIndex > 0) {
      sheet.deleteRow(rowIndex);
      return { success: true, message: "🗑️ ลบข้อมูลสำเร็จ" };
    }
    return { success: false, message: "คำสั่งไม่ถูกต้อง" };
  } catch(e) {
    return { success: false, message: "Error: " + e.toString() };
  }
}

// ==========================================
// 2. ระบบดึงข้อมูลสำหรับหน้าตาราง (DataTable)
// ==========================================
// ปรับแก้ใน Code.gs
/*function getSheetRawData(sheetName) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  console.log("sheetName =", sheetName);
  console.log("sheet found =", sheet ? "YES" : "NO");

  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();

  console.log("rows =", data.length);

  return data.slice(1);
}

function getSheetRawData(sheetName) {
  // 1. ⚠️ ลบหรือคอมเมนต์บรรทัด sheetName = "Summary" ออก เพื่อให้รองรับแท็บอื่นๆ ได้
  if (!sheetName) {
    console.error("❌ ไม่ได้รับชื่อแผ่นงานจากหน้าเว็บ (sheetName is undefined)");
    return [];
  }
  
  const ss = SpreadsheetApp.openById("1vnR4UjbrytZoGnwdkM7pSuHQaUx_1Ik62zji3K15qh4");
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    console.error("❌ หาชีตชื่อ " + sheetName + " ไม่เจอในระบบ");
    return [];
  }

  // 2. ใช้ getDataRange() เพื่อดึงขนาดตารางจริงของแท็บนั้นๆ อัตโนมัติ (ไม่ล็อกแค่คอลัมน์ E)
  const data = sheet.getDataRange().getDisplayValues(); 
  
  // ตัดแถวแรก (หัวตาราง) ออกไป
  const bodyData = data.slice(1);

  // 3. กรองเอาเฉพาะแถวที่มีข้อมูลอยู่จริง (คอลัมน์แรก ID ต้องไม่ว่าง)
  const filteredData = bodyData.filter(row => row[0] !== "");

  console.log("แท็บ: " + sheetName + " ดึงข้อมูลได้ทั้งหมด = " + filteredData.length + " แถว");
  return filteredData;
}

// ==========================================
// 3. ระบบคำนวณ Dashboard & Reports
// ==========================================
function getDashboardData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var res = { grandTotal: 0, pack6: 0, pack24: 0, totalOrders: 0 };
  
  // PO Count
  var po = ss.getSheetByName("PO_Customer");
  if (po) res.totalOrders = Math.max(0, po.getLastRow() - 1);
  
  // Pack 6 & 24 calculation
  ['Pack6', 'Pack24'].forEach(name => {
    var sh = ss.getSheetByName(name);
    if (sh) {
      var data = sh.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var val = parseFloat(data[i][4]) || 0; // สมมติคอลัมน์ E (index 4) เป็นจำนวน
        if (name === 'Pack6') res.pack6 += val;
        else res.pack24 += val;
      }
    }
  });
  res.grandTotal = (res.pack6 * 6) + (res.pack24 * 24);
  return res;
}
/**
 * คำนวณสรุปยอด PO และเทียบกับยอดที่ผลิตจริง

function getPOSummaryReport() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var reportMap = {};
    

    // 1. ดึงข้อมูล PO_Customer
    var poSheet = ss.getSheetByName("PO_Customer");
    if (poSheet) {
      var poData = poSheet.getDataRange().getValues();
      for (var i = 1; i < poData.length; i++) {
        var row = poData[i];
        if (!row[2]) continue; // เลข PO (คอลัมน์ C)
        var key = String(row[2]).trim() + "_" + String(row[3]).trim(); // PO + Product
        reportMap[key] = { 
          brand: row[1], 
          po: row[2], 
          product: row[3], 
          targetQty: parseFloat(row[4]) || 0, 
          actualQty: 0 
        };
      }
    }

    // 2. ดึงข้อมูล Pack24 (ปรับ Index ให้ตรงกับข้อมูลของคุณ)
    var p24Sheet = ss.getSheetByName("Pack24");
    if (p24Sheet) {
      var d24 = p24Sheet.getDataRange().getValues();
      for (var k = 1; k < d24.length; k++) {
        // ตามข้อมูลที่คุณส่งมา: Order คือคอลัมน์ที่ 7 (Index 6), Product คอลัมน์ที่ 6 (Index 5), จำนวน คอลัมน์ที่ 5 (Index 4)
        var poNum = String(d24[k][6] || "").trim(); 
        var product = String(d24[k][5] || "").trim(); 
        var qty = parseFloat(d24[k][4]) || 0; 

        var key = poNum + "_" + product;
        if (reportMap[key]) {
          reportMap[key].actualQty += qty;
        }
      }
    }

    var finalReport = Object.values(reportMap).map(item => {
      item.diffQty = item.targetQty - item.actualQty;
      return item;
    });

    return finalReport;
  } catch (err) {
    return [];
  }
}

function getPackagingData() {
  try {
    const ss = SpreadsheetApp.openById("1vnR4UjbrytZoGnwdkM7pSuHQaUx_1Ik62zji3K15qh4");
    const sheet = ss.getSheetByName("Packaging_Master"); 
    
    if (!sheet) {
      console.error("❌ ไม่พบแผ่นงานชื่อ Packaging_Master");
      return [];
    }
    
    const data = sheet.getDataRange().getDisplayValues();
    if (data.length <= 1) return []; // มีแต่หัวตาราง ไม่มีข้อมูล
    
    const headers = data[0].map(h => String(h).trim()); // ดึงแถวที่ 1 (หัวตาราง) มาหาชื่อคอลัมน์
    const rows = data.slice(1);
    
    // ค้นหาตำแหน่งคอลัมน์อัตโนมัติจากชื่อหัวตาราง (ปรับคำให้ตรงกับใน Google Sheets ของคุณ)
    const idxId = headers.indexOf("ID") !== -1 ? headers.indexOf("ID") : 0;
    const idxCategory = headers.indexOf("ประเภทบรรจุภัณฑ์") !== -1 ? headers.indexOf("ประเภทบรรจุภัณฑ์") : 1;
    const idxName = headers.indexOf("รายการย่อย") !== -1 ? headers.indexOf("รายการย่อย") : 2;
    const idxUnit = headers.indexOf("หน่วยนับ") !== -1 ? headers.indexOf("หน่วยนับ") : 3;
    
       return rows.map(row => {
  return {
    id: row[idxId] ? String(row[idxId]).trim() : "",
    category: row[idxCategory] ? String(row[idxCategory]).trim().toLowerCase() : "", // เติม .toLowerCase() ตรงนี้
    name: row[idxName] ? String(row[idxName]).trim() : "",
    unit: row[idxUnit] ? String(row[idxUnit]).trim() : ""
  };
});
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดใน getPackagingData:", error.message);
    return [];
  }
}
/--------------------
function getPOTrackingData() {
  try {
    const ss = SpreadsheetApp.openById("1vnR4UjbrytZoGnwdkM7pSuHQaUx_1Ik62zji3K15qh4");
    
    // 1. ดึงข้อมูลแผนสั่งซื้อทั้งหมดจากแท็บ PO_Customer
    const sheetPO = ss.getSheetByName("PO_Customer");
    if (!sheetPO) return [];
    const dataPO = sheetPO.getDataRange().getDisplayValues().slice(1);
    
    // 2. ดึงข้อมูลบันทึกการแพ็คทั้งหมดจากแท็บ Pack24 มาประมวลผลคำนวณข้ามชีต
    const sheetPack24 = ss.getSheetByName("Pack24");
    let dataPack24 = [];
    let idxPackOrder = 6;   // คอลัมน์ Order/PO ใน Pack24 (ดัชนี 6 = คอลัมน์ G ตามจริงของคุณ)
    let idxPackQty = 4;     // คอลัมน์ จำนวน ใน Pack24 (ดัชนี 4 = คอลัมน์ E ตามจริงของคุณ)
    let idxPackProduct = 5; // คอลัมน์ ผลิตภัณฑ์ ใน Pack24 (ดัชนี 5 = คอลัมน์ F ตามจริงของคุณ)

    if (sheetPack24) {
      const rawPack24Data = sheetPack24.getDataRange().getDisplayValues();
      if (rawPack24Data.length > 0) {
        // เจาะจงดึงแถวแรกมาแกะหาชื่อหัวตารางอัตโนมัติ
        const packHeaders = rawPack24Data[0].map(h => String(h).trim()); 
        dataPack24 = rawPack24Data.slice(1); 
        
        // ค้นหาตำแหน่งคอลัมน์อัตโนมัติจากชื่อหัวตารางจริงในชีต Pack24
        if (packHeaders.indexOf("Order") !== -1) idxPackOrder = packHeaders.indexOf("Order");
        if (packHeaders.indexOf("PO") !== -1) idxPackOrder = packHeaders.indexOf("PO"); 
        
        if (packHeaders.indexOf("จำนวน") !== -1) idxPackQty = packHeaders.indexOf("จำนวน");
        if (packHeaders.indexOf("จำนวน (Tray)") !== -1) idxPackQty = packHeaders.indexOf("จำนวน (Tray)"); 
        if (packHeaders.indexOf("จำนวนขวด") !== -1) idxPackQty = packHeaders.indexOf("จำนวนขวด"); 

        if (packHeaders.indexOf("ผลิตภัณฑ์") !== -1) idxPackProduct = packHeaders.indexOf("ผลิตภัณฑ์");
      }
    }
    
    // 3. เริ่มกระบวนการแมปจับคู่ยอดสั่งซื้อ โดยคัดแยกละเอียดแบบรายออเดอร์คู่ขนานรายผลิตภัณฑ์
    return dataPO.map(row => {
      //const poNo = String(row[2]).trim();      // คอลัมน์ C: เลขที่ PO / Order
      //const product = String(row[3]).trim();   // คอลัมน์ D: ผลิตภัณฑ์หลัก (เช่น OR, CM)
      const poNo = String(row[2] || "").trim(); 
      const product = String(row[3] || "").trim();
      const brand = String(row[1] || "").trim();
      const orderQty = parseInt(row[4]) || 0;

            // วนลูปคัดกรองเพื่อรวมยอดเฉพาะแถวที่ "Order ตรงกัน" และ "ผลิตภัณฑ์ตรงกันเป๊ะ"
      let totalPacked = 0;
      dataPack24.forEach(pRow => {
        const packOrder   = pRow[idxPackOrder] ? String(pRow[idxPackOrder]).trim() : ''; 
        const packProduct = pRow[idxPackProduct] ? String(pRow[idxPackProduct]).trim() : ''; 
        const packQty     = pRow[idxPackQty] ? parseInt(pRow[idxPackQty]) : 0; 
        
        // ล้างเครื่องหมายจุด (.) และเคาะเว้นวรรคเพื่อความแม่นยำสูงสุดก่อนเปรียบเทียบ
        const cleanPackOrder   = packOrder.replace(/^\.+|\.+$/g, "").trim().toLowerCase();
        const cleanPoNo        = poNo.replace(/^\.+|\.+$/g, "").trim().toLowerCase();
        const cleanPackProduct = packProduct.trim().toLowerCase();
        const cleanTargetProd  = product.trim().toLowerCase();
        
        // 🎯 เช็กเงื่อนไขคู่ขนาน: เลขที่ Order ต้องตรงกัน และ ชื่อผลิตภัณฑ์ต้องสะกดตรงกัน (เช่น OR == OR)
        if (cleanPackOrder !== "" && cleanPackOrder === cleanPoNo && cleanPackProduct === cleanTargetProd) {
          totalPacked += packQty;
        }
      });
      
      return {
        tfcCode: row[5] || "-", // คอลัมน์ F (TfcCode)
        poNo: poNo,
        brand: String(row[1]).trim(),    // คอลัมน์ B: Brand (ชื่อลูกค้า)
        product: product,               // คอลัมน์ D: ผลิตภัณฑ์
        orderQty: parseInt(row[4]) || 0, // คอลัมน์ E: ยอดรวม (Tray) ➡️ แผนยอดสั่งซื้อหลัก
        packedQty: totalPacked           // 📥 ยอดรวมที่กรองแยกประเภทผลิตภัณฑ์ส่งกลับไปวาดตาราง
      };
    });
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดใน getPOTrackingData:", error.message);
    return [];
  }
}

//โหลด order
function getActivePOList() {
  try {
    const ss = SpreadsheetApp.openById("1vnR4UjbrytZoGnwdkM7pSuHQaUx_1Ik62zji3K15qh4");
    const sheet = ss.getSheetByName("PO_Customer");
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getDisplayValues();
    if (data.length <= 1) return [];
    
    const rows = data.slice(1);
    // คัดเอาเฉพาะคอลัมน์ที่ 3 (ดัชนี 2 ซึ่งเป็นเลขที่ PO) และกรองเอาค่าว่างออก
    const poList = rows.map(row => String(row[2]).trim()).filter(po => po !== "");
    
    // กำจัดรายการที่ซ้ำกันออก เพื่อให้ได้รายชื่อ PO ที่ไม่ซ้ำ
    return [...new Set(poList)];
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดใน getActivePOList:", error.message);
    return [];
  }
}
//โหลด Product
function getActiveProductList() {
  try {
    const ss = SpreadsheetApp.openById("1vnR4UjbrytZoGnwdkM7pSuHQaUx_1Ik62zji3K15qh4");
    const sheet = ss.getSheetByName("PO_Customer");
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getDisplayValues();
    if (data.length <= 1) return [];
    
    const rows = data.slice(1);
    // คัดเอาเฉพาะคอลัมน์ที่ 4 (ดัชนี 3 ซึ่งเป็นชื่อผลิตภัณฑ์) และกรองเอาค่าว่างออก
    const productList = rows.map(row => String(row[3]).trim()).filter(prod => prod !== "");
    
    // กำจัดรายการที่ซ้ำกันออก เพื่อให้ได้รายชื่อผลิตภัณฑ์ที่ระบุไว้ไม่ซ้ำ
    return [...new Set(productList)];
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดใน getActiveProductList:", error.message);
    return [];
  }
}
function getDashboardChartData() {
  try {
    var ss = SpreadsheetApp.openById("1vnR4UjbrytZoGnwdkM7pSuHQaUx_1Ik62zji3K15qh4");
    var poSheet = ss.getSheetByName("PO_Customer");
    if (!poSheet) return [];

    var trackingData = getPOTrackingData(); 

    // ใช้ map เพียงครั้งเดียว เพื่อสร้าง object ที่มีทั้งข้อมูลตารางและข้อมูลกราฟ
    return trackingData.map(item => {
      var target = item.orderQty || 0;
      var actual = item.packedQty || 0;
      var diff = target - actual;
      var percent = target > 0 ? ((actual / target) * 100) : 0;

      return {
        // ข้อมูลสำหรับแสดงในตาราง
        brand: item.brand,
        poNo: item.poNo,
        product: item.product,
        target: target,
        actual: actual,
        diff: diff,
        percent: parseFloat(percent.toFixed(2)),
        
        // ข้อมูลสำหรับกราฟ (รวมอยู่ใน Object เดียวกันได้เลย)
        label: `${item.poNo} (${item.product})` 
      };
    });
  } catch (err) {
    console.error("Error in getDashboardChartData: " + err.message);
    return [];
  }
}

//-------------------------------------------------
function getPOTrackingReport() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var reportMap = {};

    // 1. ดึง PO_Customer
    var poSheet = ss.getSheetByName('PO_Customer');
    if (poSheet) {
      poSheet.getDataRange().getValues().slice(1).forEach(function(r) {
        if (!r[2]) return;
        var key = String(r[2]).trim() + '___' + String(r[3]).trim();
        reportMap[key] = {
          brand:    String(r[1] || ''),
          po:       String(r[2] || '').trim(),
          product:  String(r[3] || '').trim(),
          target:   parseFloat(r[4]) || 0, // ยอดรวม (Tray)
          actual:   0,
          tfcCode:  String(r[5] || '')
        };
      });
    }

    // 2. สะสมยอดจาก Pack6 (จำนวน Pack × 6 ÷ 24 = ถาด)
    var p6Sheet = ss.getSheetByName('Pack6');
    if (p6Sheet) {
      p6Sheet.getDataRange().getValues().slice(1).forEach(function(r) {
        var po      = String(r[6] || '').trim();
        var product = String(r[5] || '').trim();
        var qty     = (parseFloat(r[4]) || 0) * 6; // Pack × 6 = ขวด
        if (!po) return;
        var key = po + '___' + product;
        if (reportMap[key]) reportMap[key].actual += qty;
      });
    }

    // 3. สะสมยอดจาก Pack24 (จำนวน Tray × 24 = ขวด)
    var p24Sheet = ss.getSheetByName('Pack24');
    if (p24Sheet) {
      p24Sheet.getDataRange().getValues().slice(1).forEach(function(r) {
        var po      = String(r[6] || '').trim();
        var product = String(r[5] || '').trim();
        var qty     = (parseFloat(r[4]) || 0) * 24; // Tray × 24 = ขวด
        if (!po) return;
        var key = po + '___' + product;
        if (reportMap[key]) reportMap[key].actual += qty;
      });
    }

    // 4. คำนวณผลลัพธ์ — แปลงขวดเป็นถาด (÷ 24)
    var report = Object.values(reportMap).map(function(item) {
      var actualTray = item.actual / 24; // ขวดรวม ÷ 24 = ถาด
      var diff       = item.target - actualTray;
      var pct        = item.target > 0 ? ((actualTray / item.target) * 100).toFixed(1) : '0.0';

      var status = actualTray === 0         ? 'ยังไม่เริ่ม' :
                   actualTray >= item.target ? 'ครบแล้ว'     :
                   diff <= item.target * 0.1 ? 'ใกล้ครบ'     : 'กำลังผลิต';

      return [
        item.brand,
        item.po,
        item.product,
        item.target,                        // ยอดสั่ง (ถาด)
        Math.floor(actualTray),             // แพ็คได้จริง (ถาด)
        Math.ceil(diff),                    // คงเหลือ (ถาด)
        pct,
        status,
        item.tfcCode
      ];
    });

    return report;
  } catch(e) {
    Logger.log('Error: ' + e.toString());
    return [];
  }
}
function getPOList() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PO_Customer');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues().slice(1);
  // เอาเฉพาะ PO ที่ไม่ซ้ำกัน
  const seen = {};
  return data
    .filter(function(r) { return r[2]; })
    .filter(function(r) {
      var po = String(r[2]).trim();
      if (seen[po]) return false;
      seen[po] = true;
      return true;
    })
    .map(function(r) {
      return { po: String(r[2]).trim(), brand: String(r[1]||'') };
    });
}
//--------------------------------------------------------------------------------
function getLatestProduction() {
  const sh =SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Summary");
  const data =sh.getDataRange().getValues();
  let latestDate = null;
  // หา วันที่ล่าสุด
  for (let i = 1; i < data.length; i++) {
    if (!data[i][1]) continue;
    const d = new Date(data[i][1]);
    if (!latestDate || d > latestDate) {
      latestDate = d;
    }
  }
  if (!latestDate) {
    return {
      date: "-",
      bottles: 0
    };
  }
  const latestStr =
    Utilities.formatDate(
      latestDate,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );
  let total = 0;
  // รวมยอดขวดของวันล่าสุด
  for (let i = 1; i < data.length; i++) {
    if (!data[i][1]) continue;
    const d =
      Utilities.formatDate(
        new Date(data[i][1]),
        Session.getScriptTimeZone(),
        "yyyy-MM-dd"
      );
    if (d === latestStr) {
      total += Number(data[i][4]) || 0;
    }
  }
  return {
    date:
      Utilities.formatDate(
        latestDate,
        Session.getScriptTimeZone(),
        "dd/MM/yyyy"
      ),
    bottles: total
  };
}
//-----------------------------------------
function getProduction7Days() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName("Summary");
  const data = sh.getDataRange().getValues();
  const summary = {};
  for (let i = 1; i < data.length; i++) {
    const date = data[i][1]; // วันที่
    const qty  = Number(data[i][4]) || 0;
    if (!date) continue;
    const key = Utilities.formatDate(
      new Date(date),
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );
    summary[key] = (summary[key] || 0) + qty;
  }
  return Object.keys(summary)
    .sort()
    .slice(-7)
    .map(function(date){
      return {
        date: date,
        bottles: summary[date]
      };
    });
}*/
//--------------------------------------------------------------------------------------
// ==========================================
// 4. ระบบ Data Master (Packaging List)
// ==========================================
function getPackagingData() {
  return [
    { id: 1, name: "ฉลาก Laban Thai OR", category: "ฉลาก", unit: "ชิ้น" },
    { id: 2, name: "ฉลาก Laban Thai CM", category: "ฉลาก", unit: "ชิ้น" },
    { id: 3, name: "ฉลาก Laban Thai BN", category: "ฉลาก", unit: "ชิ้น" },
    { id: 4, name: "กลาก Laban Thai MG", category: "ฉลาก", unit: "ชิ้น" },
    { id: 5, name: "ฉลาก Laban Thai CN", category: "ฉลาก", unit: "ชิ้น" },
    { id: 6, name: "ฉลาก Laban Thai BK", category: "ฉลาก", unit: "ชิ้น" },
    { id: 7, name: "ฉลาก GT Thai ใหม่ (Seven)", category: "ฉลาก", unit: "ชิ้น" },
    { id: 8, name: "ฉลาก (Liverpool) OR Low sugar", category: "ฉลาก", unit: "ชิ้น" },
    { id: 9, name: "ฉลาก Laban Ampol OR", category: "ฉลาก", unit: "ชิ้น" },
    { id: 10, name: "ฉลาก Laban Ampol BK", category: "ฉลาก", unit: "ชิ้น" },
    { id: 11, name: "ฉลาก Laban Ampol GT", category: "ฉลาก", unit: "ชิ้น" },
    { id: 12, name: "ฉลาก Laban Arab OR", category: "ฉลาก", unit: "ชิ้น" },
    { id: 13, name: "ฉลาก Laban Arab CM", category: "ฉลาก", unit: "ชิ้น" },
    { id: 14, name: "ฉลาก Laban Arab BN", category: "ฉลาก", unit: "ชิ้น" },
    { id: 15, name: "ฉลาก Laban Arab MG", category: "ฉลาก", unit: "ชิ้น" },
    { id: 16, name: "ฉลาก Laban Arab CN", category: "ฉลาก", unit: "ชิ้น" },
    { id: 17, name: "ฉลาก Laban Arab BK", category: "ฉลาก", unit: "ชิ้น" },
    { id: 18, name: "กลาก Laban OTINO CN", category: "ฉลาก", unit: "ชิ้น" },
    { id: 19, name: "ฉลาก Laban OTTNO Low Sugar", category: "ฉลาก", unit: "ชิ้น" },
    { id: 20, name: "ฉลาก Laban Ghana OR", category: "ฉลาก", unit: "ชิ้น" },
    { id: 21, name: "ฉลาก Laban Ghana CM", category: "ฉลาก", unit: "ชิ้น" },
    { id: 22, name: "ฉลาก Laban Ghana BN", category: "ฉลาก", unit: "ชิ้น" },
    { id: 23, name: "ฉลาก V-MIN SOY OR ฉลากใหม่", category: "ฉลาก", unit: "ชิ้น" },
    { id: 24, name: "ฉลาก V-MIN SOY OR ฉลากเก่า", category: "ฉลาก", unit: "ชิ้น" },
    { id: 25, name: "ฉลาก V-MIN SOY CM ฉลากใหม่", category: "ฉลาก", unit: "ชิ้น" },
    { id: 26, name: "ฉลาก V-MIN SOY CM ฉลากเก่า", category: "ฉลาก", unit: "ชิ้น" },
    { id: 27, name: "ฉลาก V-MIN SOY MG ฉลากใหม่", category: "ฉลาก", unit: "ชิ้น" },
    { id: 28, name: "ฉลาก V-MIN SOY MG ฉลากเก่า", category: "ฉลาก", unit: "ชิ้น" },
    { id: 29, name: "ฉลาก V-MIN SOY CN ฉลากใหม่", category: "ฉลาก", unit: "ชิ้น" },
    { id: 30, name: "ฉลาก V-MIN SOY CN ฉลากเก่า", category: "ฉลาก", unit: "ชิ้น" },
    { id: 31, name: "ฉลาก V-MIN SOY BN ฉลากใหม่", category: "ฉลาก", unit: "ชิ้น" },
    { id: 32, name: "ฉลาก V-MIN SOY BN ฉลาก version ใหม่", category: "ฉลาก", unit: "ชิ้น" },
    { id: 33, name: "ฉลาก V-MIN SOY BN ฉลากเก่า", category: "ฉลาก", unit: "ชิ้น" },
    { id: 34, name: "ฉลาก BON OR ใหม่", category: "ฉลาก", unit: "ชิ้น" },
    { id: 35, name: "ฉลาก BON CM ใหม่", category: "ฉลาก", unit: "ชิ้น" },
    { id: 36, name: "ฉลาก CPI OR (Congo)", category: "ฉลาก", unit: "ชิ้น" },
    { id: 37, name: "ฉลาก CPI CM (Congo)", category: "ฉลาก", unit: "ชิ้น" },
    { id: 38, name: "ฉลาก CP1 BN (Congo)", category: "ฉลาก", unit: "ชิ้น" },
    { id: 39, name: "ฉลาก Evermilk OR", category: "ฉลาก", unit: "ชิ้น" },
    { id: 40, name: "ฉลาก Evermilk CM", category: "ฉลาก", unit: "ชิ้น" },
    { id: 41, name: "ฉลาก Evermilk BN", category: "ฉลาก", unit: "ชิ้น" },
    { id: 42, name: "ฉลาก Evermilk BK", category: "ฉลาก", unit: "ชิ้น" },
    { id: 43, name: "ฉลาก Costa OR", category: "ฉลาก", unit: "ชิ้น" },
    { id: 44, name: "ฉลาก Costa CM", category: "ฉลาก", unit: "ชิ้น" },
    { id: 45, name: "ฉลาก Costa MG", category: "ฉลาก", unit: "ชิ้น" },
    { id: 46, name: "ฉลาก Costa BN ฉลากชิ้น", category: "ฉลาก", unit: "ชิ้น" },
    { id: 47, name: "ฉลาก Costa CN ฉลากชิ้น", category: "ฉลาก", unit: "ชิ้น" },
    { id: 48, name: "ฉลาก PINOY OR", category: "ฉลาก", unit: "ชิ้น" },
    { id: 49, name: "ฉลาก PINOY CM", category: "ฉลาก", unit: "ชิ้น" },
    { id: 50, name: "ฉลาก PINOY MG", category: "ฉลาก", unit: "ชิ้น" },
    { id: 51, name: "ฉลาก PINOY BK", category: "ฉลาก", unit: "ชิ้น" },
    { id: 52, name: "ฉลาก BESTIE OR", category: "ฉลาก", unit: "ชิ้น" },
    { id: 53, name: "ฉลาก BESTIE CM", category: "ฉลาก", unit: "ชิ้น" },
    { id: 54, name: "ฉลาก BESTIE MG", category: "ฉลาก", unit: "ชิ้น" },
    { id: 55, name: "ฉลาก Tropical Sun OR", category: "ฉลาก", unit: "ชิ้น" },
    { id: 56, name: "ฉลาก Tropical Sun MG", category: "ฉลาก", unit: "ชิ้น" },
    { id: 57, name: "ฉลาก Eraly Spring OR", category: "ฉลาก", unit: "ชิ้น" },
    { id: 58, name: "ฉลาก Eraly Spring MG", category: "ฉลาก", unit: "ชิ้น" },
    { id: 59, name: "ฉลาก CROP OR", category: "ฉลาก", unit: "ชิ้น" },
    { id: 60, name: "ฉลาก CROP CM", category: "ฉลาก", unit: "ชิ้น" },
    { id: 61, name: "ฉลาก CROP BN", category: "ฉลาก", unit: "ชิ้น" },
    { id: 62, name: "ฉลาก CROP MG", category: "ฉลาก", unit: "ชิ้น" },
    { id: 63, name: "ชิ้นคอ BK-Thai /Spire (สีดำ)", category: "ชิ้นคอ", unit: "ชิ้น" },
    { id: 64, name: "ชิ้นคอ สีเหลืองรูปภาพดำ OR Spire / BNV mintก่า", category: "ชิ้นคอ", unit: "ชิ้น" },
    { id: 65, name: "ชิ้นคอขวด (Liverpool) OR Low ชมพู", category: "ชิ้นคอ", unit: "ชิ้น" },
    { id: 66, name: "คอ Labansoy MS (LV) OR V-min", category: "ชิ้นคอ", unit: "ชิ้น" },
    { id: 67, name: "ชิ้นคอ BN Spire/Thai/GT (ฟ้าอ่อน)", category: "ชิ้นคอ", unit: "ชิ้น" },
    { id: 68, name: "ชิ้นคอขวด CN Thai/Vmin/Liver (เขียวอ่อน)", category: "ชิ้นคอ", unit: "ชิ้น" },
    { id: 69, name: "ชิ้นคอ MG Thai/Liver (ขาว)", category: "ชิ้นคอ", unit: "ชิ้น" },
    { id: 70, name: "ชิ้นคอเขียวส้มแขก MG V - minใหม่", category: "ชิ้นคอ", unit: "ชิ้น" },
    { id: 71, name: "ชิ้นคอขวด สีเหลืองรูปภาพแตง", category: "ชิ้นคอ", unit: "ชิ้น" },
    { id: 72, name: "ชิ้นคอขวด Vmin CMเก่า (แดง)", category: "ชิ้นคอ", unit: "ชิ้น" },
    { id: 73, name: "ชิ้นคอขวด Thaj BK (เทา)", category: "ชิ้นคอ", unit: "ชิ้น" },
    { id: 74, name: "ชิ้นคอขวด Thaj MG (ส้ม)", category: "ชิ้นคอ", unit: "ชิ้น" },
    { id: 75, name: "คอขวด Thaj OR (เขียว)", category: "ชิ้นคอ", unit: "ชิ้น" },
    { id: 76, name: "ชิ้นคอขวด Thaj CM (น้ำตาล)", category: "ชิ้นคอ", unit: "ชิ้น" },
    { id: 77, name: "ชิ้นคอ Costa OR", category: "ชิ้นคอ", unit: "ชิ้น" },
    { id: 78, name: "ชิ้นคอ Costa CM 3rolls", category: "ชิ้นคอ", unit: "ชิ้น" },
    { id: 79, name: "ชิ้นคอ Costa MG 4rolls", category: "ชิ้นคอ", unit: "ชิ้น" },
    { id: 80, name: "ชิ้นคอ Costa BN ชิ้นคอชิ้น", category: "ชิ้นคอ", unit: "ชิ้น" },
    { id: 81, name: "ชิ้นคอ Costa CN ชิ้นคอชิ้น", category: "ชิ้นคอ", unit: "ชิ้น" },
    { id: 82, name: "ชิ้นคอ CROP OR", category: "ชิ้นคอ", unit: "ชิ้น" },
    { id: 83, name: "ชิ้นคอ CROP CM", category: "ชิ้นคอ", unit: "ชิ้น" },
    { id: 84, name: "ชิ้นคอ CROP BN", category: "ชิ้นคอ", unit: "ชิ้น" },
    { id: 85, name: "ชิ้นคอ CROP MG", category: "ชิ้นคอ", unit: "ชิ้น" },
    { id: 86, name: "Tray Laban Mix", category: "tray", unit: "ใบ" },
    { id: 87, name: "ฝาครอบ Laban", category: "tray", unit: "ใบ" },
    { id: 88, name: "Tray V-min", category: "tray", unit: "ใบ" },
    { id: 89, name: "Tray Bon", category: "tray", unit: "ใบ" },
    { id: 90, name: "Tray CPI OR", category: "tray", unit: "ใบ" },
    { id: 91, name: "Tray CPI CM", category: "tray", unit: "ใบ" },
    { id: 92, name: "Tray CPI BN", category: "tray", unit: "ใบ" },
    { id: 93, name: "Tray Pinoy", category: "tray", unit: "ใบ" },
    { id: 94, name: "กล่อง Evermilk OR", category: "carton", unit: "ใบ" },
    { id: 95, name: "กล่อง Evermilk CM", category: "carton", unit: "ใบ" },
    { id: 96, name: "กล่อง Evermilk BN", category: "carton", unit: "ใบ" },
    { id: 97, name: "กลอง Evermilk BK", category: "carton", unit: "ใบ" },
    { id: 98, name: "กลอง Costa OR", category: "carton", unit: "ใบ" },
    { id: 99, name: "กล่อง Costa CM", category: "carton", unit: "ใบ" },
    { id: 100, name: "กลอง Costa MG", category: "carton", unit: "ใบ" },
    { id: 101, name: "กลอง Costa BN", category: "carton", unit: "ใบ" },
    { id: 102, name: "กล่อง Costa CN", category: "carton", unit: "ใบ" },
    { id: 103, name: "กล่อง BESTIE (OR)", category: "carton", unit: "ใบ" },
    { id: 104, name: "กล่อง BESTIE (CM)", category: "carton", unit: "ใบ" },
    { id: 105, name: "กล่อง BESTIE (MG)", category: "carton", unit: "ใบ" },
    { id: 106, name: "กล่อง Tropical OR", category: "carton", unit: "ใบ" },
    { id: 107, name: "กลอง Tropical MG", category: "carton", unit: "ใบ" },
    { id: 108, name: "กล่อง Laban AmpolFood OR", category: "carton", unit: "ใบ" },
    { id: 109, name: "กล่อง Laban Ampol Food BK", category: "carton", unit: "ใบ" },
    { id: 110, name: "กล่อง Laban Ampol Food GT", category: "carton", unit: "ใบ" },
    { id: 111, name: "กล่อง Early Spring", category: "carton", unit: "ใบ" },
    { id: 112, name: "กล่อง CROP OR", category: "carton", unit: "ใบ" },
    { id: 113, name: "กล่อง CROP CM", category: "carton", unit: "ใบ" },
    { id: 114, name: "กล่อง CROP BN", category: "carton", unit: "ใบ" },
    { id: 115, name: "กล่อง CROP MG", category: "carton", unit: "ใบ" },
    { id: 116, name: "PE27 ฟิล์ม อีหด ขนาด 27 cm 5Rolls/Cont.", category: "PE", unit: "ม้วน" },
    { id: 117, name: "PE50 ฟิล์ม อีหด ขนาด 50 cm 4Rolls/Cont", category: "PE", unit: "ม้วน" },
    { id: 118, name: "เทปใส 100 หลา", category: "PE", unit: "ม้วน" },
    { id: 119, name: "เทปใส 1000 หลา", category: "PE", unit: "ม้วน" },
    { id: 120, name: "ฟิล์มแร็พพาเลช", category: "PE", unit: "ม้วน" },
    { id: 121, name: "ฟิล์มนมโรงเรียน", category: "PE", unit: "ม้วน" },
    { id: 122, name: "Ribbon", category: "PE", unit: "ม้วน" },
    { id: 123, name: "ถุงหัว", category: "PE", unit: "มัด" },
    { id: 124, name: "ขวดฝาเกลียว", category: "ขวด", unit: "พาเลท" },
    { id: 125, name: "ขวดปากจีบ", category: "ขวด", unit: "พาเลท" },
    { id: 126, name: "ซอง Ecolean OR (41 ม้วน)", category: "ซอง Ecolean", unit: "ซอง" },
    { id: 127, name: "ซอง Ecolean Yummy & Milky (65 ม้วน)", category: "ซอง Ecolean", unit: "ซอง" },
    { id: 128, name: "ซอง Low sugar (58 ม้วน)", category: "ซอง Ecolean", unit: "ซอง" },
    { id: 129, name: "ซอง Plus Goat Milk (63 ม้วน)", category: "ซอง Ecolean", unit: "ซอง" },
    { id: 130, name: "ซอง Ecolean MS นมโค (37ม้วน)", category: "ซอง Ecolean", unit: "ซอง" },
    { id: 131, name: "ฝาจีบไม่พิมพ์", category: "ฝา", unit: "กล่อง" },
    { id: 133, name: "ฝา Maxi Laban", category: "ฝา", unit: "กล่อง" },
    { id: 136, name: "ฝาเกลียว ไม่พิมพ์", category: "ฝา", unit: "กล่อง" }
  ];
}
/**
// ==========================================
// 5. ระบบตรวจสอบข้อมูล (Debugger)
// ==========================================
function debugData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Summary");
  var data = sheet.getDataRange().getValues();
  Logger.log("จำนวนแถวทั้งหมดที่พบ: " + data.length);
  Logger.log("ข้อมูลในแถวที่ 2: " + JSON.stringify(data[1]));
}

function testPO() {

  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName("PO_Customer");

  Logger.log("Last Row = " + sheet.getLastRow());
  Logger.log("Last Col = " + sheet.getLastColumn());

  const data = sheet.getDataRange().getValues();

  Logger.log(JSON.stringify(data));
}*/
/**
 * ระบบจัดการหน่วยแพ็คกิ้ง v2.0 - Backend (Supabase Edition)
 * แปลงจาก Google Sheets มาใช้ Supabase เป็นฐานข้อมูล
 */

const SUPABASE_URL = "https://yhgrkgbarutrzhignowg.supabase.co";
const SUPABASE_KEY = "sb_publishable_P3YwKv-rIX6sEwBAoqJQHg_9mu4cM8j";

// ==========================================
// 0. โครงสร้างตาราง (ต้องตรงกับคอลัมน์จริงใน Supabase)
// ==========================================
const TABLE_CONFIG = {
  summary:           { idField: "id",  columns: ["id","วันที่","ผลิตภัณฑ์","Order","จำนวนขวดที่รับมา"] },
  pack6:             { idField: "id",  columns: ["id","วันที่ผลิต","วันที่หมดอายุ","Batch","จำนวน","ผลิตภัณฑ์","Order"] },
  pack24:            { idField: "id",  columns: ["id","วันที่ผลิต","วันที่หมดอายุ","Batch","จำนวน","ผลิตภัณฑ์","Order"] },
  bottles:           { idField: "ID",  columns: ["ID","วันที่ผลิต","วันที่หมดอายุ","Batch","จำนวน","ผลิตภัณฑ์","Order"] },
  packaging_stock:   { idField: "id",  columns: ["id","ประเภทบรรจุภัณฑ์","รายการ","จำนวน","วันที่"] },
  wip_product:       { idField: "ID",  columns: ["ID","วันที่ผลิต","วันที่หมดอายุ","Batch","จำนวน","ผลิตภัณฑ์","Order"] },
  wip_packaging:     { idField: "ID",  columns: ["ID","ประเภทบรรจุภัณฑ์","รายการ","จำนวน","วันที่"] },
  waste:             { idField: "id",  columns: ["id","ประเภทของเสีย","หัวข้อ","ผลิตภัณฑ์","Order","จำนวน","วันที่"] },
  rd_sample:         { idField: "id",  columns: ["id","วันที่ผลิต","วันที่หมดอายุ","Batch","จำนวน","ผลิตภัณฑ์","Order"] },
  po_customer:       { idField: "id",  columns: ["id","Brand","PO","ผลิตภัณฑ์","ยอดรวม","TfcCode"] },
  packaging_master:  { idField: "ลำดับ", columns: ["ลำดับ","รายการบรรจุภัณฑ์","ประเภทบรรจุภัณฑ์","หน่วย"] }
};

// Mapping ชื่อ sheetName แบบเดิมที่ frontend (Index.html) ยังใช้อยู่ ให้ตรงกับชื่อตารางจริงใน Supabase
const SHEET_NAME_MAP = {
  "Summary": "summary",
  "Pack6": "pack6",
  "Pack24": "pack24",
  "Bottles": "bottles",
  "Packaging_Stock": "packaging_stock",
  "WIP_Product": "wip_product",
  "WIP_Packaging": "wip_packaging",
  "Waste": "waste",
  "RD_Sample": "rd_sample",
  "PO_Customer": "po_customer",
  "Packaging_Master": "packaging_master"
};
function resolveTableName(name) {
  return SHEET_NAME_MAP[name] || name;
}

function doGet() {
  return HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle("ระบบจัดการหน่วยแพ็คกิ้ง v2.0")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ==========================================
// 1. Supabase core helper
// ==========================================
function supabaseRequest(table, method, options) {
  options = options || {};
  let url = SUPABASE_URL + "/rest/v1/" + table;
  if (options.query) url += "?" + options.query;

  const params = {
    method: method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: "Bearer " + SUPABASE_KEY,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation"
    },
    muteHttpExceptions: true
  };
  if (options.payload) params.payload = JSON.stringify(options.payload);

  const res = UrlFetchApp.fetch(url, params);
  const code = res.getResponseCode();
  const text = res.getContentText();

  if (code >= 400) {
    Logger.log("Supabase error [" + table + "] [" + code + "]: " + text);
    return { error: true, status: code, message: text };
  }
  return text ? JSON.parse(text) : null;
}

function getTableData(table, query) {
  return supabaseRequest(table, "get", { query: query || "select=*" });
}
function insertRow(table, rowObject) {
  return supabaseRequest(table, "post", { payload: rowObject });
}
function updateRow(table, query, rowObject) {
  return supabaseRequest(table, "patch", { query: query, payload: rowObject });
}
function deleteRow(table, query) {
  return supabaseRequest(table, "delete", { query: query });
}

// ==========================================
// 2. CRUD กลาง (ใช้แทน manageInventoryAndItems เดิม)
//    หมายเหตุ: rowData เป็น array เรียงตาม TABLE_CONFIG[table].columns
//    rowIndex (เดิมคือเลขแถวชีต) ตอนนี้ใช้เป็น "ค่า id" ของแถวที่จะแก้/ลบแทน
// ==========================================
function manageInventoryAndItems(action, sheetName, rowData, rowIndex) {
  try {
    const tableName = resolveTableName(sheetName);
    const cfg = TABLE_CONFIG[tableName];
    if (!cfg) return { success: false, message: "ไม่พบตาราง: " + sheetName };

    if (action === "ADD") {
      const obj = {};
      cfg.columns.forEach((col, i) => {
        if (col === cfg.idField) return; // ให้ Supabase auto-generate id เอง
        obj[col] = rowData[i];
      });
      const result = insertRow(tableName, obj);
      if (result && result.error) return { success: false, message: "Error: " + result.message };
      return { success: true, message: "✅ บันทึกข้อมูลสำเร็จ" };
    }

    else if (action === "EDIT" && rowIndex) {
      const obj = {};
      cfg.columns.forEach((col, i) => {
        if (col === cfg.idField) return; // ห้ามเขียนทับ id เดิม
        obj[col] = rowData[i];
      });
      const result = updateRow(tableName, cfg.idField + "=eq." + rowIndex, obj);
      if (result && result.error) return { success: false, message: "Error: " + result.message };
      return { success: true, message: "✏️ แก้ไขข้อมูลสำเร็จ" };
    }

    else if (action === "DELETE" && rowIndex) {
      const result = deleteRow(tableName, cfg.idField + "=eq." + rowIndex);
      if (result && result.error) return { success: false, message: "Error: " + result.message };
      return { success: true, message: "🗑️ ลบข้อมูลสำเร็จ" };
    }

    return { success: false, message: "คำสั่งไม่ถูกต้อง" };
  } catch (e) {
    return { success: false, message: "Error: " + e.toString() };
  }
}

// ==========================================
// 3. ดึงข้อมูลดิบสำหรับหน้าตาราง (แทน getSheetRawData เดิม)
//    คืนค่าเป็น array of arrays เรียงคอลัมน์ตาม TABLE_CONFIG เพื่อให้ frontend เดิมใช้ต่อได้
// ==========================================
function getSheetRawData(sheetName) {
  const tableName = resolveTableName(sheetName);
  const cfg = TABLE_CONFIG[tableName];
  if (!cfg) {
    console.error("❌ ไม่พบตาราง: " + sheetName);
    return [];
  }
  const data = getTableData(tableName, "select=*&order=" + cfg.idField);
  if (!data || data.error) return [];

  return data
    .filter(row => row[cfg.idField] !== null && row[cfg.idField] !== "")
    .map(row => cfg.columns.map(col => row[col]));
}

// ==========================================
// 4. Dashboard & Reports
// ==========================================
function getDashboardData() {
  const res = { grandTotal: 0, pack6: 0, pack24: 0, totalOrders: 0 };

  const po = getTableData("po_customer", "select=id");
  if (po && !po.error) res.totalOrders = po.length;

  const p6 = getTableData("pack6", "select=จำนวน");
  if (p6 && !p6.error) p6.forEach(r => res.pack6 += parseFloat(r["จำนวน"]) || 0);

  const p24 = getTableData("pack24", "select=จำนวน");
  if (p24 && !p24.error) p24.forEach(r => res.pack24 += parseFloat(r["จำนวน"]) || 0);

  res.grandTotal = (res.pack6 * 6) + (res.pack24 * 24);
  return res;
}

function getPOSummaryReport() {
  try {
    const reportMap = {};

    const poData = getTableData("po_customer");
    if (poData && !poData.error) {
      poData.forEach(row => {
        if (!row["PO"]) return;
        const key = String(row["PO"]).trim() + "_" + String(row["ผลิตภัณฑ์"]).trim();
        reportMap[key] = {
          brand: row["Brand"],
          po: row["PO"],
          product: row["ผลิตภัณฑ์"],
          targetQty: parseFloat(row["ยอดรวม"]) || 0,
          actualBottles: 0 // สะสมเป็น "ขวด" ก่อน แล้วค่อยแปลงเป็นถาดตอนสรุปผล
        };
      });
    }

    // ✅ แก้บั๊ก: เดิมรวมยอดจริงจาก pack24 อย่างเดียว ทำให้ PO ที่แพ็คผ่าน pack6 ขึ้น actual = 0 เสมอ
    ["pack6", "pack24"].forEach(tableName => {
      const multiplier = tableName === "pack6" ? 6 : 24; // pack6: 1 แพ็ค = 6 ขวด, pack24: 1 ถาด = 24 ขวด
      const data = getTableData(tableName);
      if (data && !data.error) {
        data.forEach(row => {
          const poNum = String(row["Order"] || "").trim();
          const product = String(row["ผลิตภัณฑ์"] || "").trim();
          const qty = (parseFloat(row["จำนวน"]) || 0) * multiplier;
          const key = poNum + "_" + product;
          if (reportMap[key]) reportMap[key].actualBottles += qty;
        });
      }
    });

    return Object.values(reportMap).map(item => {
      const actualQty = Math.floor(item.actualBottles / 24); // แปลงขวดรวม -> ถาด ให้หน่วยตรงกับ targetQty (ยอดรวม)
      return {
        brand: item.brand,
        po: item.po,
        product: item.product,
        targetQty: item.targetQty,
        actualQty: actualQty,
        diffQty: item.targetQty - actualQty
      };
    });
  } catch (err) {
    console.error("getPOSummaryReport error: " + err.message);
    return [];
  }
}

function getPackagingData() {
  try {
    const data = getTableData("packaging_master");
    if (!data || data.error) return [];
    return data.map(row => ({
      id: row["ลำดับ"] ? String(row["ลำดับ"]).trim() : "",
      category: row["ประเภทบรรจุภัณฑ์"] ? String(row["ประเภทบรรจุภัณฑ์"]).trim().toLowerCase() : "",
      name: row["รายการบรรจุภัณฑ์"] ? String(row["รายการบรรจุภัณฑ์"]).trim() : "",
      unit: row["หน่วย"] ? String(row["หน่วย"]).trim() : ""
    }));
  } catch (error) {
    console.error("getPackagingData error: " + error.message);
    return [];
  }
}

function getPOTrackingData() {
  try {
    const dataPO = getTableData("po_customer");
    if (!dataPO || dataPO.error) return [];

    const dataPack24 = getTableData("pack24");
    const pack24List = (dataPack24 && !dataPack24.error) ? dataPack24 : [];

    // ✅ แก้บั๊ก: เดิมไม่ได้ดึง pack6 มารวมเลย ทำให้ PO ที่แพ็คผ่าน pack6 ขึ้น packedQty = 0 เสมอ
    const dataPack6 = getTableData("pack6");
    const pack6List = (dataPack6 && !dataPack6.error) ? dataPack6 : [];

    return dataPO.map(row => {
      const poNo = String(row["PO"] || "").trim();
      const product = String(row["ผลิตภัณฑ์"] || "").trim();
      const brand = String(row["Brand"] || "").trim();
      const orderQty = parseInt(row["ยอดรวม"]) || 0;

      const cleanPoNo = poNo.replace(/^\.+|\.+$/g, "").toLowerCase();
      const cleanTargetProd = product.toLowerCase();

      let totalBottles = 0; // สะสมเป็น "ขวด" ก่อน แล้วค่อยแปลงเป็นถาดตอนสรุปผล

      pack24List.forEach(pRow => {
        const packOrder = String(pRow["Order"] || "").trim().replace(/^\.+|\.+$/g, "").toLowerCase();
        const packProduct = String(pRow["ผลิตภัณฑ์"] || "").trim().toLowerCase();
        const packQty = parseInt(pRow["จำนวน"]) || 0; // 1 ถาด = 24 ขวด
        if (packOrder !== "" && packOrder === cleanPoNo && packProduct === cleanTargetProd) {
          totalBottles += packQty * 24;
        }
      });

      pack6List.forEach(pRow => {
        const packOrder = String(pRow["Order"] || "").trim().replace(/^\.+|\.+$/g, "").toLowerCase();
        const packProduct = String(pRow["ผลิตภัณฑ์"] || "").trim().toLowerCase();
        const packQty = parseInt(pRow["จำนวน"]) || 0; // 1 แพ็ค = 6 ขวด
        if (packOrder !== "" && packOrder === cleanPoNo && packProduct === cleanTargetProd) {
          totalBottles += packQty * 6;
        }
      });

      const totalPacked = Math.floor(totalBottles / 24); // แปลงขวดรวม -> ถาด ให้หน่วยตรงกับ orderQty (ยอดรวม)

      return {
        tfcCode: row["TfcCode"] || "-",
        poNo: poNo,
        brand: brand,
        product: product,
        orderQty: orderQty,
        packedQty: totalPacked
      };
    });
  } catch (error) {
    console.error("getPOTrackingData error: " + error.message);
    return [];
  }
}

function getActivePOList() {
  try {
    const data = getTableData("po_customer", "select=PO");
    if (!data || data.error) return [];
    const list = data.map(r => String(r["PO"]).trim()).filter(po => po !== "");
    return [...new Set(list)];
  } catch (error) {
    console.error("getActivePOList error: " + error.message);
    return [];
  }
}

function getActiveProductList() {
  try {
    const data = getTableData("po_customer", "select=ผลิตภัณฑ์");
    if (!data || data.error) return [];
    const list = data.map(r => String(r["ผลิตภัณฑ์"]).trim()).filter(p => p !== "");
    return [...new Set(list)];
  } catch (error) {
    console.error("getActiveProductList error: " + error.message);
    return [];
  }
}

function getDashboardChartData() {
  try {
    const trackingData = getPOTrackingData();
    return trackingData.map(item => {
      const target = item.orderQty || 0;
      const actual = item.packedQty || 0;
      const diff = target - actual;
      const percent = target > 0 ? ((actual / target) * 100) : 0;
      return {
        brand: item.brand,
        poNo: item.poNo,
        product: item.product,
        target: target,
        actual: actual,
        diff: diff,
        percent: parseFloat(percent.toFixed(2)),
        label: `${item.poNo} (${item.product})`
      };
    });
  } catch (err) {
    console.error("getDashboardChartData error: " + err.message);
    return [];
  }
}

function getPOTrackingReport() {
  try {
    const reportMap = {};

    const poData = getTableData("po_customer");
    if (poData && !poData.error) {
      poData.forEach(r => {
        if (!r["PO"]) return;
        const key = String(r["PO"]).trim() + "___" + String(r["ผลิตภัณฑ์"]).trim();
        reportMap[key] = {
          brand: String(r["Brand"] || ""),
          po: String(r["PO"] || "").trim(),
          product: String(r["ผลิตภัณฑ์"] || "").trim(),
          target: parseFloat(r["ยอดรวม"]) || 0,
          actual: 0,
          tfcCode: String(r["TfcCode"] || "")
        };
      });
    }

    ["pack6", "pack24"].forEach(tableName => {
      const multiplier = tableName === "pack6" ? 6 : 24;
      const data = getTableData(tableName);
      if (data && !data.error) {
        data.forEach(r => {
          const po = String(r["Order"] || "").trim();
          const product = String(r["ผลิตภัณฑ์"] || "").trim();
          const qty = (parseFloat(r["จำนวน"]) || 0) * multiplier;
          if (!po) return;
          const key = po + "___" + product;
          if (reportMap[key]) reportMap[key].actual += qty;
        });
      }
    });

    return Object.values(reportMap).map(item => {
      const actualTray = item.actual / 24;
      const diff = item.target - actualTray;
      const pct = item.target > 0 ? ((actualTray / item.target) * 100).toFixed(1) : "0.0";
      const status = actualTray === 0 ? "ยังไม่เริ่ม" :
                     actualTray >= item.target ? "ครบแล้ว" :
                     diff <= item.target * 0.1 ? "ใกล้ครบ" : "กำลังผลิต";

      return [
        item.brand, item.po, item.product, item.target,
        Math.floor(actualTray), Math.ceil(diff), pct, status, item.tfcCode
      ];
    });
  } catch (e) {
    Logger.log("getPOTrackingReport error: " + e.toString());
    return [];
  }
}

function getPOList() {
  const data = getTableData("po_customer");
  if (!data || data.error) return [];
  const seen = {};
  return data
    .filter(r => r["PO"])
    .filter(r => {
      const po = String(r["PO"]).trim();
      if (seen[po]) return false;
      seen[po] = true;
      return true;
    })
    .map(r => ({ po: String(r["PO"]).trim(), brand: String(r["Brand"] || "") }));
}

function getLatestProduction() {
  const data = getTableData("summary");
  if (!data || data.error || data.length === 0) return { date: "-", bottles: 0 };

  let latestDate = null;
  data.forEach(row => {
    if (!row["วันที่"]) return;
    const d = new Date(row["วันที่"]);
    if (!latestDate || d > latestDate) latestDate = d;
  });
  if (!latestDate) return { date: "-", bottles: 0 };

  const latestStr = Utilities.formatDate(latestDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
  let total = 0;
  data.forEach(row => {
    if (!row["วันที่"]) return;
    const d = Utilities.formatDate(new Date(row["วันที่"]), Session.getScriptTimeZone(), "yyyy-MM-dd");
    if (d === latestStr) total += Number(row["จำนวนขวดที่รับมา"]) || 0;
  });

  return {
    date: Utilities.formatDate(latestDate, Session.getScriptTimeZone(), "dd/MM/yyyy"),
    bottles: total
  };
}

function getProduction7Days() {
  const data = getTableData("summary");
  if (!data || data.error) return [];

  const summary = {};
  data.forEach(row => {
    const date = row["วันที่"];
    const qty = Number(row["จำนวนขวดที่รับมา"]) || 0;
    if (!date) return;
    const key = Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), "yyyy-MM-dd");
    summary[key] = (summary[key] || 0) + qty;
  });

  return Object.keys(summary).sort().slice(-7).map(date => ({ date: date, bottles: summary[date] }));
}

// ==========================================
// 5. Debug
// ==========================================
function debugData() {
  const data = getTableData("summary");
  Logger.log("จำนวนแถวทั้งหมดที่พบ: " + (data ? data.length : 0));
  Logger.log("ข้อมูลแถวแรก: " + JSON.stringify(data ? data[0] : null));
}

function testPO() {
  const data = getTableData("po_customer");
  Logger.log(JSON.stringify(data));
}
