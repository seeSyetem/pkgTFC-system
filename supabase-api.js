/**
 * supabase-api.js
 * จำลองการทำงานของ google.script.run ให้เรียก Supabase โดยตรง
 * เพื่อให้ script.html เดิม (ที่เขียนไว้สำหรับ Apps Script) ทำงานได้บน Netlify/static hosting
 * โดยไม่ต้องแก้โค้ดฝั่ง UI เลย
 */

const SUPABASE_URL = "https://yhgrkgbarutrzhignowg.supabase.co";
const SUPABASE_KEY = "sb_publishable_P3YwKv-rIX6sEwBAoqJQHg_9mu4cM8j";

// ==========================================
// 0. โครงสร้างตาราง + mapping ชื่อชีตเดิม
// ==========================================
const TABLE_CONFIG = {
  summary:           { idField: "id",  columns: ["id","วันที่","ผลิตภัณฑ์","Order","จำนวนขวดที่รับมา"] },
  pack6:             { idField: "id",  columns: ["id","วันที่ผลิต","วันที่หมดอายุ","Batch","จำนวน","ผลิตภัณฑ์","Order"] },
  pack24:            { idField: "id",  columns: ["id","วันที่ผลิต","วันที่หมดอายุ","Batch","จำนวน","ผลิตภัณฑ์","Order"] },
  bottles:           { idField: "id",  columns: ["id","วันที่ผลิต","วันที่หมดอายุ","Batch","จำนวน","ผลิตภัณฑ์","Order"] },
  packaging_stock:   { idField: "id",  columns: ["id","ประเภทบรรจุภัณฑ์","รายการ","จำนวน","วันที่"] },
  wip_product:       { idField: "id",  columns: ["id","วันที่ผลิต","วันที่หมดอายุ","Batch","จำนวน","ผลิตภัณฑ์","Order"] },
  wip_packaging:     { idField: "id",  columns: ["id","ประเภทบรรจุภัณฑ์","รายการ","จำนวน","วันที่"] },
  waste:             { idField: "id",  columns: ["id","ประเภทของเสีย","หัวข้อ","ผลิตภัณฑ์","Order","จำนวน","วันที่"] },
  rd_sample:         { idField: "id",  columns: ["id","วันที่ผลิต","วันที่หมดอายุ","Batch","จำนวน","ผลิตภัณฑ์","Order"] },
  po_customer:       { idField: "id",  columns: ["id","Brand","PO","ผลิตภัณฑ์","ยอดรวม","TfcCode"] },
  packaging_master:  { idField: "ลำดับ", columns: ["ลำดับ","รายการบรรจุภัณฑ์","ประเภทบรรจุภัณฑ์","หน่วย"] }
};

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

// ==========================================
// 1. Supabase core helper (fetch แทน UrlFetchApp)
// ==========================================
async function supabaseRequest(table, method, options) {
  options = options || {};
  let url = SUPABASE_URL + "/rest/v1/" + table;
  if (options.query) url += "?" + options.query;

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: "Bearer " + SUPABASE_KEY,
    "Content-Type": "application/json",
    Prefer: options.prefer || "return=representation"
  };

  const res = await fetch(url, {
    method: method,
    headers: headers,
    body: options.payload ? JSON.stringify(options.payload) : undefined
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("Supabase error [" + table + "] [" + res.status + "]: " + text);
    return { error: true, status: res.status, message: text };
  }
        if (text) {
          return JSON.parse(text);}
          return {
            success:true,
            message:"DELETE OK"
          };
}

function getTableData(table, query) {
  return supabaseRequest(table, "GET", { query: query || "select=*" });
}
function insertRow(table, rowObject) {
  return supabaseRequest(table, "POST", { payload: rowObject });
}
function updateRow(table, query, rowObject) {
  return supabaseRequest(table, "PATCH", { query: query, payload: rowObject });
}
/*function deleteRow(table, query) {
  return supabaseRequest(table, "DELETE", { query: query });
}*/
async function deleteRow(table, query) {

  console.log("🔥 deleteRow START");
  console.log("TABLE =", table);
  console.log("QUERY =", query);

  const result = await supabaseRequest(
    table,
    "DELETE",
    {
      query: query
    }
  );

  console.log("🔥 deleteRow RESULT =", result);

  return result;
}
// ==========================================
// 2. ฟังก์ชัน Backend (พอร์ตมาจาก Code.gs ทุกตัว)
// ==========================================
const BackendAPI = {};

BackendAPI.manageInventoryAndItems = async function(action, sheetName, rowData, rowIndex) {
  try {
    const tableName = resolveTableName(sheetName);
    const cfg = TABLE_CONFIG[tableName];
    if (!cfg) return { success: false, message: "ไม่พบตาราง: " + sheetName };

    if (action === "ADD") {
    /* const obj = buildRowObject(cfg, rowData);
     const result = await insertRow(tableName, obj);*/
     const obj = {};
            cfg.columns.forEach((col, i) => {
              if (col === cfg.idField) return;
              obj[col] = rowData[i];
            });
            const result = await insertRow(tableName, obj);
      if (result && result.error) return { success: false, message: "Error: " + result.message };
      return { success: true, message: "✅ บันทึกข้อมูลสำเร็จ" };
    }
    else if (action === "EDIT" && rowIndex) {
       const obj = {};
      cfg.columns.forEach((col, i) => {
        if (col === cfg.idField) return;
        obj[col] = rowData[i];
      });
      const updateresult = await updateRow(
        tableName,
        cfg.idField + "=eq." + rowIndex,
        obj
      );
      if (updateresult && updateresult.error) return { success: false, message: "Error: " + updateresult.message };
      return { success: true, message: "✏️ แก้ไขข้อมูลสำเร็จ" };
    }
    else if (action === "DELETE" && rowIndex) {
  let idValue = rowIndex;
  if (typeof idValue === "string" && idValue.includes("=eq.")) {
    idValue = idValue.split("=eq.")[1];
  }
  const filter = `${cfg.idField}=eq.${idValue}`;
  console.log("DELETE FILTER:", filter);
  const result = await supabaseRequest(
    tableName,
    "DELETE",
    {
      query: filter,
      prefer: "return=representation"
    }
  );
  console.log("DIRECT DELETE RESULT:", result);
  if (result && result.error) {
    return {
      success:false,
      message:"Error: " + result.message
    };
  }
  return {
    success:true,
    message:"🗑️ ลบข้อมูลสำเร็จ"
  };
 }
}
  catch(err){
            console.error(
              "manageInventoryAndItems error:",
              err
            );
            return {
              success:false,
              message:err.message
            };
   }
};
BackendAPI.getSheetRawData = async function(sheetName) {
  const tableName = resolveTableName(sheetName);
  const cfg = TABLE_CONFIG[tableName];
  if (!cfg) { console.error("❌ ไม่พบตาราง: " + sheetName); return []; }

  const data = await getTableData(tableName, "select=*&order=" + cfg.idField);
  if (!data || data.error) return [];
  return data
    .filter(row => row[cfg.idField] !== null && row[cfg.idField] !== "")
    .map(row => cfg.columns.map(col => row[col]));
};

BackendAPI.getDashboardData = async function() {
  const res = { grandTotal: 0, pack6: 0, pack24: 0, totalOrders: 0, _debug: [] };
  const po = await getTableData("po_customer", "select=id");
  if (po && !po.error) { res.totalOrders = po.length; res._debug.push("po_customer: " + po.length + " แถว"); }
  else res._debug.push("po_customer ERROR: " + (po && po.message));

  const p6 = await getTableData("pack6", "select=จำนวน");
  if (p6 && !p6.error) { p6.forEach(r => res.pack6 += parseFloat(r["จำนวน"]) || 0); res._debug.push("pack6: " + p6.length + " แถว, รวม=" + res.pack6); }
  else res._debug.push("pack6 ERROR: " + (p6 && p6.message));

  const p24 = await getTableData("pack24", "select=จำนวน");
  if (p24 && !p24.error) { p24.forEach(r => res.pack24 += parseFloat(r["จำนวน"]) || 0); res._debug.push("pack24: " + p24.length + " แถว, รวม=" + res.pack24); }
  else res._debug.push("pack24 ERROR: " + (p24 && p24.message));

  res.grandTotal = (res.pack6 * 6) + (res.pack24 * 24);
  return res;
};

BackendAPI.getPOSummaryReport = async function() {
  try {
    const reportMap = {};
    const poData = await getTableData("po_customer");
    if (poData && !poData.error) {
      poData.forEach(row => {
        if (!row["PO"]) return;
        const key = String(row["PO"]).trim() + "_" + String(row["ผลิตภัณฑ์"]).trim();
        reportMap[key] = {
          brand: row["Brand"], po: row["PO"], product: row["ผลิตภัณฑ์"],
          targetQty: parseFloat(row["ยอดรวม"]) || 0, actualQty: 0
        };
      });
    }
    const p24Data = await getTableData("pack24");
    if (p24Data && !p24Data.error) {
      p24Data.forEach(row => {
        const poNum = String(row["Order"] || "").trim();
        const product = String(row["ผลิตภัณฑ์"] || "").trim();
        const qty = parseFloat(row["จำนวน"]) || 0;
        const key = poNum + "_" + product;
        if (reportMap[key]) reportMap[key].actualQty += qty;
      });
    }
    return Object.values(reportMap).map(item => {
      item.diffQty = item.targetQty - item.actualQty;
      return item;
    });
  } catch (err) {
    console.error("getPOSummaryReport error: " + err.message);
    return [];
  }
};
BackendAPI.getPackagingData = async function() {
  try {
    const data = await getTableData("packaging_master");
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
};

BackendAPI.getPOTrackingData = async function() {
  try {
    const dataPO = await getTableData("po_customer");
    if (!dataPO || dataPO.error) return [];
    const dataPack24 = await getTableData("pack24");
    const pack24List = (dataPack24 && !dataPack24.error) ? dataPack24 : [];

    return dataPO.map(row => {
      const poNo = String(row["PO"] || "").trim();
      const product = String(row["ผลิตภัณฑ์"] || "").trim();
      const brand = String(row["Brand"] || "").trim();
      const orderQty = parseInt(row["ยอดรวม"]) || 0;

      let totalPacked = 0;
      pack24List.forEach(pRow => {
        const packOrder = String(pRow["Order"] || "").trim().replace(/^\.+|\.+$/g, "").toLowerCase();
        const packProduct = String(pRow["ผลิตภัณฑ์"] || "").trim().toLowerCase();
        const packQty = parseInt(pRow["จำนวน"]) || 0;
        const cleanPoNo = poNo.replace(/^\.+|\.+$/g, "").toLowerCase();
        const cleanTargetProd = product.toLowerCase();
        if (packOrder !== "" && packOrder === cleanPoNo && packProduct === cleanTargetProd) {
          totalPacked += packQty;
        }
      });

      return { tfcCode: row["TfcCode"] || "-", poNo, brand, product, orderQty, packedQty: totalPacked };
    });
  } catch (error) {
    console.error("getPOTrackingData error: " + error.message);
    return [];
  }
};

BackendAPI.getActivePOList = async function() {
  try {
    const data = await getTableData("po_customer", "select=PO");
    if (!data || data.error) return [];
    return [...new Set(data.map(r => String(r["PO"]).trim()).filter(po => po !== ""))];
  } catch (error) {
    console.error("getActivePOList error: " + error.message);
    return [];
  }
};

BackendAPI.getActiveProductList = async function() {
  try {
    const data = await getTableData("po_customer", "select=ผลิตภัณฑ์");
    if (!data || data.error) return [];
    return [...new Set(data.map(r => String(r["ผลิตภัณฑ์"]).trim()).filter(p => p !== ""))];
  } catch (error) {
    console.error("getActiveProductList error: " + error.message);
    return [];
  }
};

BackendAPI.getDashboardChartData = async function() {
  try {
    const trackingData = await BackendAPI.getPOTrackingData();
    return trackingData.map(item => {
      const target = item.orderQty || 0;
      const actual = item.packedQty || 0;
      const diff = target - actual;
      const percent = target > 0 ? ((actual / target) * 100) : 0;
      return {
        brand: item.brand, poNo: item.poNo, product: item.product,
        target, actual, diff, percent: parseFloat(percent.toFixed(2)),
        label: `${item.poNo} (${item.product})`
      };
    });
  } catch (err) {
    console.error("getDashboardChartData error: " + err.message);
    return [];
  }
};

BackendAPI.getPOTrackingReport = async function() {
  try {
    const reportMap = {};
    const poData = await getTableData("po_customer");
    if (poData && !poData.error) {
      poData.forEach(r => {
        if (!r["PO"]) return;
        const key = String(r["PO"]).trim() + "___" + String(r["ผลิตภัณฑ์"]).trim();
        reportMap[key] = {
          brand: String(r["Brand"] || ""), po: String(r["PO"] || "").trim(),
          product: String(r["ผลิตภัณฑ์"] || "").trim(), target: parseFloat(r["ยอดรวม"]) || 0,
          actual: 0, tfcCode: String(r["TfcCode"] || "")
        };
      });
    }
    for (const [tableName, multiplier] of [["pack6", 6], ["pack24", 24]]) {
      const data = await getTableData(tableName);
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
    }
    return Object.values(reportMap).map(item => {
      const actualTray = item.actual / 24;
      const diff = item.target - actualTray;
      const pct = item.target > 0 ? ((actualTray / item.target) * 100).toFixed(1) : "0.0";
      const status = actualTray === 0 ? "ยังไม่เริ่ม" :
                     actualTray >= item.target ? "ครบแล้ว" :
                     diff <= item.target * 0.1 ? "ใกล้ครบ" : "กำลังผลิต";
      return [item.brand, item.po, item.product, item.target, Math.floor(actualTray), Math.ceil(diff), pct, status, item.tfcCode];
    });
  } catch (e) {
    console.error("getPOTrackingReport error: " + e.toString());
    return [];
  }
};

BackendAPI.getPOList = async function() {
  const data = await getTableData("po_customer");
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
};
BackendAPI.getLatestProduction = async function() {
  try {
    const data = await getTableData(
      "summary",
      "select=*"
    );
    console.log("Summary Data:", data);
    if (!data || data.error || data.length === 0) {
      return {
        date: "-",
        bottles: 0
     };
    }
    let latestDate = null;
    data.forEach(row => {
      if (!row["วันที่"]) return;
      const d = new Date(row["วันที่"]);
      if (!latestDate || d > latestDate) {
        latestDate = d;
      }
    });
    if (!latestDate) {
      return {
        date:"-",
        bottles:0
      };

    }
    const y = latestDate.getFullYear();
    const m = String(
      latestDate.getMonth()+1
    ).padStart(2,"0");
    const d2 = String(
      latestDate.getDate()
    ).padStart(2,"0");
    const latestKey =
      `${y}-${m}-${d2}`;
    let total = 0;
    data.forEach(row=>{
      if(!row["วันที่"]) return;
      const dt = new Date(row["วันที่"]);
      const key =
      `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
      if(key === latestKey){
        total += Number(
          row["จำนวนขวดที่รับมา"]
        ) || 0;
      }
    });
    return {
      date:`${d2}/${m}/${y}`,
      bottles:total
    };
  }
  catch(error){
    console.error(
      "getLatestProduction error:",
      error
    );
    return {
      date:"-",
      bottles:0
    };
  }
};
BackendAPI.getProduction7Days = async function() {
  const data = await getTableData("summary");
  if (!data || data.error) return [];

  const summary = {};
  data.forEach(row => {
    const date = row["วันที่"];
    const qty = Number(row["จำนวนขวดที่รับมา"]) || 0;
    if (!date) return;
    const dt = new Date(date);
    const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
    summary[key] = (summary[key] || 0) + qty;
  });

  return Object.keys(summary).sort().slice(-7).map(date => ({ date, bottles: summary[date] }));
};

// ==========================================
// 3. Shim จำลอง google.script.run ให้หน้าตาเหมือนเดิมทุกอย่าง
// ==========================================
function makeRunner(successFn, failureFn) {
  const handlers = {
    withSuccessHandler(fn) { return makeRunner(fn, failureFn); },
    withFailureHandler(fn) { return makeRunner(successFn, fn); }
  };
  return new Proxy(handlers, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return function(...args) {
        if (typeof BackendAPI[prop] !== "function") {
          console.error("ไม่พบฟังก์ชัน backend: " + String(prop));
          if (failureFn) failureFn({ message: "ไม่พบฟังก์ชัน: " + String(prop) });
          return;
        }
        Promise.resolve(BackendAPI[prop](...args))
          .then(result => { if (successFn) successFn(result); })
          .catch(err => {
            console.error(err);
            if (failureFn) failureFn(err);
          });
      };
    }
  });
}
function buildRowObject(cfg, rowData) {
  const obj = {};
  let j = 0;
  cfg.columns.forEach(col => {
    // ไม่ส่ง id ถ้าฐานข้อมูลสร้างเอง (IDENTITY/AUTO INCREMENT)
    if (col === cfg.idField) return;
    obj[col] = j < rowData.length ? rowData[j++] : null;
  });
  return obj;
}
window.google = {
  script: {
    run: makeRunner(null, null)
  }
};
