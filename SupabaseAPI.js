
function getSupabase(table){
  const url = SUPABASE_URL+
  "/rest/v1/"+table+
  "?select=*";
  const options={
    method:"get",
    headers:{
      apikey:SUPABASE_KEY,
      Authorization:"Bearer "+SUPABASE_KEY
    },
    muteHttpExceptions:true
  };
  const res=UrlFetchApp.fetch(url,options);
  return JSON.parse(res.getContentText());
}

function getTableData(table){
  const url =
  SUPABASE_URL +
  "/rest/v1/" +
  table +
  "?select=*";
  const options={
    method:"get",
    headers:{
      apikey:SUPABASE_KEY,
      Authorization:"Bearer "+SUPABASE_KEY
    }
  };
  const res = UrlFetchApp.fetch(url,options);
  return JSON.parse(res.getContentText());
}

function inspectAllTables() {
  const tables = [
    "summary", "pack6", "pack24", "bottles",
    "packaging_stock", "wip_product", "wip_packaging",
    "waste", "rd_sample", "po_customer", "packaging_master"
  ];

  tables.forEach(table => {
    const url = SUPABASE_URL + "/rest/v1/" + table + "?select=*&limit=1";
    const options = {
      method: "get",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + SUPABASE_KEY
      },
      muteHttpExceptions: true
    };
    const res = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(res.getContentText());
    const columns = data.length > 0 ? Object.keys(data[0]) : "ตารางว่าง ไม่มีข้อมูลให้ดูคอลัมน์";
    Logger.log(table + " → " + JSON.stringify(columns));
  });
}
