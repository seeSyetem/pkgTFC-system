

// ชื่อชีต -> ชื่อตารางใน Supabase
const TABLES = {
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
const COLUMN_MAP = {

  "Summary":{
    "ID":"id",
    "วันที่":"วันที่",
    "ผลิตภัณฑ์":"ผลิตภัณฑ์",
    "Order":"Order",
    "จำนวนขวดที่รับมา":"จำนวนขวดที่รับมา"
  },


  "Pack6":{
    "ID":"id",
    "วันที่ผลิต":"วันที่ผลิต",
    "วันที่หมดอายุ":"วันที่หมดอายุ",
    "Batch":"Batch",
    "จำนวน":"จำนวน",
    "ผลิตภัณฑ์":"ผลิตภัณฑ์",
    "Order":"Order"
  },


  "Pack24":{
    "ID":"id",
    "วันที่ผลิต":"วันที่ผลิต",
    "วันที่หมดอายุ":"วันที่หมดอายุ",
    "Batch":"Batch",
    "จำนวน":"จำนวน",
    "ผลิตภัณฑ์":"ผลิตภัณฑ์",
    "Order":"Order"
  },


  "Bottles":{
    "ID":"id",
    "วันที่ผลิต":"วันที่ผลิต",
    "วันที่หมดอายุ":"วันที่หมดอายุ",
    "Batch":"Batch",
    "จำนวน":"จำนวน",
    "ผลิตภัณฑ์":"ผลิตภัณฑ์",
    "Order":"Order"
  },


  "Packaging_Stock":{
    "ID":"id",
    "ประเภทบรรจุภัณฑ์":"ประเภทบรรจุภัณฑ์",
    "รายการ":"รายการ",
    "จำนวน":"จำนวน",
    "วันที่":"วันที่"
  },


  "WIP_Product":{
    "ID":"id",
    "วันที่ผลิต":"วันที่ผลิต",
    "วันที่หมดอายุ":"วันที่หมดอายุ",
    "Batch":"Batch",
    "จำนวน":"จำนวน",
    "ผลิตภัณฑ์":"ผลิตภัณฑ์",
    "Order":"Order"
  },


  "WIP_Packaging":{
    "ID":"id",
    "ประเภทบรรจุภัณฑ์":"ประเภทบรรจุภัณฑ์",
    "รายการ":"รายการ",
    "จำนวน":"จำนวน",
    "วันที่":"วันที่"
  },


  "Waste":{
    "ID":"id",
    "ประเภทของเสีย":"ประเภทของเสีย",
    "หัวข้อ":"หัวข้อ",
    "ผลิตภัณฑ์":"ผลิตภัณฑ์",
    "Order":"Order",
    "จำนวน":"จำนวน",
    "วันที่":"วันที่"
  },


  "RD_Sample":{
    "ID":"id",
    "วันที่ผลิต":"วันที่ผลิต",
    "วันที่หมดอายุ":"วันที่หมดอายุ",
    "Batch":"Batch",
    "จำนวน":"จำนวน",
    "ผลิตภัณฑ์":"ผลิตภัณฑ์",
    "Order":"Order"
  },


  "PO_Customer":{
    "ID":"id",
    "Brand":"Brand",
    "PO":"PO",
    "ผลิตภัณฑ์":"ผลิตภัณฑ์",
    "ยอดรวม":"ยอดรวม",
    "TfcCode":"TfcCode"
  },


  "Packaging_Master":{
    "ลำดับ":"ลำดับ",
    "รายการบรรจุภัณฑ์":"รายการบรรจุภัณฑ์",
    "ประเภทบรรจุภัณฑ์":"ประเภทบรรจุภัณฑ์",
    "หน่วย":"หน่วย"
  }

};
function formatDateTH(value){

  if(value instanceof Date){

    return Utilities.formatDate(
      value,
      "Asia/Bangkok",
      "yyyy-MM-dd"
    );

  }

  return value;

}
function syncAllSheetsToSupabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABLES).forEach(sheetName => {
    const tableName = TABLES[sheetName];
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) return;
    const headers = values.shift();
              values.forEach(row => {
              let obj = {};
              headers.forEach((h,i)=>{
                if(!h) return;   // ข้าม Header ว่าง
               let key = String(h)
                .trim()
                .toLowerCase();
               let headerName = String(h).trim();
                if(COLUMN_MAP[sheetName] && COLUMN_MAP[sheetName][headerName]){
                  key = COLUMN_MAP[sheetName][headerName];
                }
                  obj[key]=formatDateTH(row[i]);
              });
              Logger.log(JSON.stringify(obj));
              insertSupabase(tableName,obj);
                });
    Logger.log("Sync : "+sheetName+" Success");
  });
}
function insertSupabase(table,data){
  const url =
  SUPABASE_URL+
  "/rest/v1/"+table;
  const options={
  method:"post",
  contentType:"application/json",
  headers:{
    apikey:SUPABASE_KEY,
    Authorization:"Bearer "+SUPABASE_KEY,
    Prefer:"resolution=merge-duplicates"
  },
  payload:JSON.stringify(data),
  muteHttpExceptions:true
};
  const res=UrlFetchApp.fetch(url,options);
  Logger.log(res.getContentText());
}
function startSync(){
   syncAllSheetsToSupabase();
}
