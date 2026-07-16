
  let mainChart = null;

 // ตัวแปรส่วนกลางสำหรับเก็บข้อมูลทั้งหมดที่ดึงมาจากหลังบ้าน Code.gs
// ⚠️ ต้องประกาศตัวแปรรอไว้ที่บรรทัดบนสุดของแท็กสคริปต์นอกฟังก์ชันทุกตัวเสมอ!
// 1. ประกาศตัวแปรส่วนกลางเพื่อรองรับการเก็บคลังข้อมูล 133 รายการ
if (typeof allPackagingData === 'undefined') {
  var allPackagingData = []; 
}

// 2. ดักจับทันทีเมื่อโหลดหน้าจอเสร็จ ให้สั่งดึงข้อมูลและผูกระบบเข้าด้วยกัน
document.addEventListener("DOMContentLoaded", function () {
  
  // 1. ดึงข้อมูลจาก Sheets มาเก็บไว้ในตัวแปร global
  google.script.run.withSuccessHandler(function(data) {
    if (data && data.length > 0) {
      allPackagingData = data;
      console.log("✅ คลังบรรจุภัณฑ์โหลดสำเร็จ:", allPackagingData.length, "รายการ");
    }
  }).getPackagingData();

  // 2. ผูก Event ให้ Dropdown ตัวเดิม
  const mainSelect1 = document.getElementById('pkg-main-select');
  if (mainSelect1) {
    mainSelect1.addEventListener('change', function() {
      renderSubOptions('pkg-main-select', 'pkg-sub-select');
    });
    console.log("🎯 ผูก Event เข้ากับ #pkg-main-select เรียบร้อย");
  }

  // 3. ผูก Event ให้ Dropdown ตัวใหม่ (WIP)
  const mainSelectWip = document.getElementById('pkg-main-select-wip');
  if (mainSelectWip) {
    mainSelectWip.addEventListener('change', function() {
      renderSubOptions('pkg-main-select-wip', 'pkg-sub-select-wip'); // อย่าลืมตั้งชื่อ ID ของช่องรายการย่อยให้ตรงกันนะครับ
    });
    console.log("🎯 ผูก Event เข้ากับ #pkg-main-select-wip เรียบร้อย");
  }
});

// 3. ฟังก์ชันหลักสำหรับประมวลผลคัดกรองและวาดรายการย่อยลงหน้าจอ
function renderSubOptions(mainId, subId) {
  // รับค่า ID ผ่านตัวแปร mainId และ subId แทนการระบุชื่อตายตัว
  const mainSelect = document.getElementById(mainId).value;
  const subSelect = document.getElementById(subId);
  
  if (!subSelect) return;
  subSelect.innerHTML = ''; 
  
  // ระบบซ่อมแซมข้อมูล (เหมือนเดิม)
  if (!allPackagingData || allPackagingData.length === 0) {
    subSelect.innerHTML = '<option value="">-- กำลังรีโหลดคลังข้อมูลระบบ... --</option>';
    google.script.run.withSuccessHandler(function(data) {
      allPackagingData = data;
      renderSubOptions(mainId, subId); // เรียกใช้ซ้ำโดยส่ง ID เดิมเข้าไป
    }).getPackagingData();
    return;
  }
  
  if (!mainSelect) {
    subSelect.innerHTML = '<option value="">-- เลือกรายการย่อย --</option>';
    return;
  }
  
  // กรองข้อมูล
  const filteredOptions = allPackagingData.filter(item => {
    const itemCategory = item.category ? String(item.category).trim().toLowerCase() : '';
    return itemCategory === mainSelect.trim().toLowerCase();
  });
  
  if (filteredOptions.length === 0) {
    subSelect.innerHTML = '<option value="">-- ไม่มีรายการย่อยในหมวดนี้ --</option>';
    return;
  }
  
  // เติมข้อมูลลง Select
  let defaultEl = document.createElement('option');
  defaultEl.value = "";
  defaultEl.innerText = "-- เลือกรายการย่อย --";
  subSelect.appendChild(defaultEl);
  
  filteredOptions.forEach(item => {
    let el = document.createElement('option');
    el.value = item.name || '';
    el.innerText = item.id ? `${item.id}. ${item.name} (${item.unit})` : `${item.name} (${item.unit})`; 
    subSelect.appendChild(el);
  });
}
  /// ฟังก์ชันส่วนกลางสำหรับการส่งข้อมูลฟอร์มบันทึก / แก้ไขข้อมูลย่อย (ปรับปรุงการเรียงคอลัมน์ตามหน้าจอจริง)
  /**
 * ฟังก์ชันบันทึกข้อมูลแบบ Dynamic ตามชื่อ Sheet
 * โดยใช้ Mapping Object เพื่อระบุลำดับคอลัมน์ให้ตรงกับ Google Sheet
 */
function handleSave(sheetName) {

const form = document.getElementById(`f-${sheetName}`);

if (!form) {
alert(`ไม่พบ Form : f-${sheetName}`);
return;
}

if (!form.checkValidity()) {
form.reportValidity();
return;
}

const columnMapping = {
'Summary': ['ID', 'วันที่', 'ผลิตภัณฑ์', 'Order', 'จำนวนขวดที่รับมา'],
'Pack6': ['ID', 'วันที่ผลิต', 'วันที่หมดอายุ', 'Batch', 'จำนวน', 'ผลิตภัณฑ์', 'Order'],
'Pack24': ['ID', 'วันที่ผลิต', 'วันที่หมดอายุ', 'Batch', 'จำนวน', 'ผลิตภัณฑ์', 'Order'],
'Bottles': ['ID', 'วันที่ผลิต', 'วันที่หมดอายุ', 'Batch', 'จำนวน', 'ผลิตภัณฑ์', 'Order'],
'Packaging_Stock': ['ID', 'ประเภทบรรจุภัณฑ์', 'รายการ', 'จำนวน', 'วันที่'],
'WIP_Product': ['ID', 'วันที่ผลิต', 'วันที่หมดอายุ', 'Batch', 'จำนวน', 'ผลิตภัณฑ์', 'Order'],
'WIP_Packaging': ['ID', 'ประเภทบรรจุภัณฑ์', 'รายการ', 'จำนวน', 'วันที่'],
'Waste': ['ID', 'ประเภทของเสีย', 'หัวข้อ', 'ผลิตภัณฑ์', 'Order', 'จำนวน', 'วันที่'],
'RD_Sample': ['ID', 'วันที่ผลิต', 'วันที่หมดอายุ', 'Batch', 'จำนวน', 'ผลิตภัณฑ์', 'Order'],
'PO_Customer': ['ID', 'Brand', 'PO', 'ผลิตภัณฑ์', 'ยอดรวม', 'TfcCode'],
};

const inputs = form.querySelectorAll('input, select, textarea');
const formData = {};

inputs.forEach(input => {
if (input.name) {
formData[input.name] = input.value.trim();
}
});

// rowNum ตอนนี้คือค่า "id" จริงจาก Supabase (ไม่ใช่เลขแถวชีตอีกต่อไป)
const rowIndex = formData.rowNum
? parseInt(formData.rowNum, 10)
: 0;

const rowData = columnMapping[sheetName].map(
key => formData[key] || ''
);

const action = rowIndex > 0 ? 'EDIT' : 'ADD';

google.script.run
.withSuccessHandler(res => {

  console.log(res);

  if (res.success) {

    alert(res.message || 'บันทึกสำเร็จ');

    form.reset();

    const rowNumInput =
      form.querySelector('input[name="rowNum"]');

    if (rowNumInput) {
      rowNumInput.value = '';
    }

    loadData(sheetName);

    if (sheetName === 'PO_Customer') {
      refreshDashboard();
    }

  } else {
    alert('Error : ' + res.message);
  }

})
.withFailureHandler(err => {
  console.error(err);
  alert('เกิดข้อผิดพลาด : ' + err.message);
})
.manageInventoryAndItems(
  action,
  sheetName,
  rowData,
  rowIndex
);

}

 /**
 * ฟังก์ชันโหลดข้อมูลอเนกประสงค์
 * @param {string} sheetName - ชื่อของชีตที่ต้องการโหลด
 */
document.addEventListener("DOMContentLoaded", function () {
  function bindTabEvent(buttonId, sheetName) {
    const btn = document.getElementById(buttonId);
    if (btn) {
      btn.addEventListener('shown.bs.tab', function () {
        loadData(sheetName);
      });
      if (btn.classList.contains('active')) {
        loadData(sheetName);
      }
    }
  }

  bindTabEvent('btn-tab-summary', 'Summary');
  bindTabEvent('btn-tab-pack6', 'Pack6');
  bindTabEvent('btn-tab-pack24', 'Pack24');
  bindTabEvent('btn-tab-bottles', 'Bottles');
  bindTabEvent('btn-tab-packaging', 'Packaging_Stock');
  bindTabEvent('btn-tab-wip-product', 'WIP_Product');
  bindTabEvent('btn-tab-wip-packaging', 'WIP_Packaging');
  bindTabEvent('btn-tab-waste', 'Waste');
  bindTabEvent('btn-tab-rd', 'RD_Sample');
  bindTabEvent('btn-tab-po', 'PO_Customer');

  // ✅ เพิ่มบรรทัดนี้ — แท็บ "ติดตาม PO" ไม่มีการผูก event มาก่อน
  const poBtn = document.getElementById('btn-tab-po_sum');
  if (poBtn) {
    poBtn.addEventListener('shown.bs.tab', function () {
      if (typeof loadPOTracking === 'function') loadPOTracking();
    });
    if (poBtn.classList.contains('active')) {
      if (typeof loadPOTracking === 'function') loadPOTracking();
    }
  }
});


function loadData(sheetName) {
  if (!sheetName) return;
  const tbody = document.getElementById(`t-${sheetName}`);
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="20" class="text-center"><div class="spinner-border spinner-border-sm"></div> กำลังโหลดข้อมูล...</td></tr>`;

  // 1. ดึงชื่อคอลัมน์จากหัวตาราง HTML (<th>) เพื่อรู้ว่าตารางด้านล่างเรียงหัวข้ออย่างไร
  const table = tbody.closest('table');
  let tableHeaders = [];
  if (table) {
    const ths = table.querySelectorAll('thead th');
    ths.forEach(th => {
      tableHeaders.push(th.textContent.trim()); // เช่น ['ID', 'วันที่', 'ผลิตภัณฑ์', 'Order', 'จำนวนขวด', 'Actions']
    });
  }

  google.script.run
    .withSuccessHandler(function(data) {
      tbody.innerHTML = '';
      if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="20" class="text-center text-muted">ไม่พบข้อมูล</td></tr>`;
        return;
      }

      data.forEach(function(row, index) {
        const tr = document.createElement('tr');
        // ⚠️ แก้ไข: ใช้ค่า id จริงจาก Supabase (คอลัมน์แรกของแถวเสมอ) แทนเลขแถวชีตปลอม (index+2)
        const rowIndex = row[0];

        // 2. สร้าง Object เพื่อเก็บคู่ข้อมูล { ชื่อหัวตาราง : ค่าข้อมูล } สำหรับปุ่ม Edit
        const rowDataMapping = {};

        row.forEach(function(col, colIdx) {
          const td = document.createElement('td');
          let displayValue = '';

          // ดักจับรูปแบบวัตถุวันที่และสกัดข้อความสากล YYYY-MM-DD
          if (col instanceof Date) {
            if (!isNaN(col.getTime())) {
              const y = col.getFullYear();
              const m = String(col.getMonth() + 1).padStart(2, '0');
              const d = String(col.getDate()).padStart(2, '0');
              displayValue = `${y}-${m}-${d}`;
            } else {
              displayValue = String(col || '');
            }
          } else {
            displayValue = (col !== null && col !== undefined) ? String(col) : '';
          }

          td.textContent = displayValue;
          tr.appendChild(td);

          // ผูกค่าเข้ากับชื่อหัวตาราง ณ ดัชนีคอลัมน์นั้นๆ
          const headerName = tableHeaders[colIdx];
          if (headerName && headerName !== 'Actions') {
            rowDataMapping[headerName] = displayValue;
          }
        });

        const tdAction = document.createElement('td');
        tdAction.className = 'text-center';

        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn btn-warning btn-sm me-1';
        btnEdit.textContent = 'Edit';
        
        // ส่งโครงสร้างข้อมูลแมปตามชื่อหัวตารางไปใช้งานที่ฟังก์ชัน Edit
        btnEdit.onclick = function() { 
          editRow(sheetName, rowIndex, rowDataMapping); 
        };

        const btnDelete = document.createElement('button');
        btnDelete.className = 'btn btn-danger btn-sm';
        btnDelete.textContent = 'Delete';
        btnDelete.onclick = function() { 
          if(confirm('คุณต้องการลบข้อมูลแถวนี้ใช่หรือไม่?')) {
            if (typeof deleteRow === 'function') deleteRow(sheetName, rowIndex); 
          }
        };

        tdAction.appendChild(btnEdit);
        tdAction.appendChild(btnDelete);
        tr.appendChild(tdAction);
        tbody.appendChild(tr);
      });
    })
    .withFailureHandler(function(error) {
      console.error(error);
      tbody.innerHTML = `<tr><td colspan="20" class="text-center text-danger">❌ ${error.message || error}</td></tr>`;
    })
    .getSheetRawData(sheetName);
}

function editRow(sheetName, rowNum, rowDataMapping) {
    console.log(`🛠️ เริ่มฟังก์ชัน editRow อัจฉริยะแมปตาม Name สำหรับแท็บ: ${sheetName}`, rowDataMapping);
    
    const form = document.getElementById('f-' + sheetName);
    if (!form) return;

    // ใส่ค่า id จริงลงช่องซ่อนสำหรับอ้างอิงตอนบันทึกแก้ไข
    const hiddenRowNum = form.querySelector('[name="rowNum"]');
    if (hiddenRowNum) hiddenRowNum.value = rowNum;

    // ดึงกล่องกรอกข้อมูลทั้งหมดในฟอร์มที่ไม่ใช่ช่องซ่อน rowNum ออกมาทำคู่ขนาน
    const inputs = form.querySelectorAll('input:not([name="rowNum"]), select, textarea');

    inputs.forEach(input => {
        if (input.name) {
            const inputName = input.name.trim(); // เช่น "วันที่", "ผลิตภัณฑ์", "Order", "จำนวนขวดที่รับมา"
            let targetValue = undefined;

            // วิ่งหาค่าใน rowDataMapping โดยเปรียบเทียบคำที่ใกล้เคียงที่สุด (ดักคำที่พิมพ์ต่างเล็กน้อย)
            for (const key in rowDataMapping) {
                if (key === inputName || inputName.includes(key) || key.includes(inputName)) {
                    targetValue = rowDataMapping[key];
                    break;
                }
            }

            // หากหาคำคู่แมตช์ที่ตรงตามชื่อช่องเจอกระจายข้อมูลลงช่องนั้นทันที
            if (targetValue !== undefined) {
                // อุดรอยรั่วฟอร์แมตปฏิทินของช่องอินพุตประเภทวันที่
                if (input.type === 'date' && targetValue.includes('T')) {
                    input.value = targetValue.split('T')[0];
                } else {
                    input.value = targetValue;
                }

                // กรณีพิเศษ: ถ้าเป็นแท็บเบิกจ่ายบรรจุภัณฑ์และเป็นช่องหัวข้อหลัก ให้รีโหลดตัวเลือกย่อยทันที
                if (sheetName === 'Packaging_Stock' && input.id === 'pkg-main-select') {
                    if (typeof renderSubOptions === 'function') renderSubOptions();
                    else if (typeof updateSubOptions === 'function') updateSubOptions();
                }
            }
        }
    });
    
    // จัดการกรณีแท็บ Packaging_Stock หยอดค่าช่องรายการย่อยซ้ำอีกครั้งหลังโหลดตัวเลือกย่อยเสร็จ
    if (sheetName === 'Packaging_Stock') {
        const subInput = form.querySelector('[name="รายการ"]') || form.querySelector('#pkg-sub-select');
        if (subInput) {
            for (const key in rowDataMapping) {
                if (key.includes('รายการ') || key.includes('ย่อย')) {
                    subInput.value = rowDataMapping[key];
                    break;
                }
            }
        }
    }

    // เปลี่ยนข้อความบนปุ่มบันทึกในฟอร์มเป็น "อัปเดตข้อมูลแก้ไข"
    const btn = form.querySelector('button');
    if (btn) btn.innerText = "อัปเดตข้อมูลแก้ไข";
    
    // เลื่อนหน้าจอขึ้นด้านบนไปยังจุดฟอร์มกรอกข้อมูลแบบสมูท
    window.scrollTo({ top: form.offsetTop, behavior: 'smooth' });
}


// ฟังก์ชันสั่งลบแถวข้อมูล (rowNum ตอนนี้คือค่า id จริงจาก Supabase)
function deleteRow(sheetName, rowNum) {
  if (!confirm("คุณมั่นใจที่จะลบรายการแถวข้อมูลนี้ใช่หรือไม่?")) return;
  google.script.run
    .withSuccessHandler(res => {
      alert(res.message || "ลบข้อมูลเรียบร้อยแล้ว");
      loadData(sheetName);
      if (typeof refreshDashboard === 'function') refreshDashboard();
    })
    .manageInventoryAndItems("DELETE", sheetName, [], rowNum);
}


// ⚠️ ฟังก์ชันนี้ไม่ได้ถูกเรียกใช้งานจริงในระบบ (ถูกแทนที่ด้วย loadData ตัวกลาง) เก็บไว้เผื่ออ้างอิง ไม่แนะนำให้ใช้
function loadPOData() {
  const tbody = document.getElementById('t-PO_Customer');
  tbody.innerHTML = '<tr><td colspan="6" class="text-center">กำลังโหลดข้อมูล...</td></tr>';

  google.script.run
    .withSuccessHandler(function(data) {
      tbody.innerHTML = ''; // ล้างสถานะโหลด
      
      if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">ไม่พบข้อมูลในระบบ</td></tr>';
        return;
      }

      data.forEach(function(row) {
        const rowData = row;      // getSheetRawData คืนเป็น array of arrays
        const rowNum = row[0];    // คอลัมน์แรกคือ id จริง

        // สร้าง HTML แถวตาราง
        let tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${rowData[0] || '-'}</td>
          <td>${rowData[1] || '-'}</td>
          <td>${rowData[2] || '-'}</td>
          <td>${rowData[3] || '-'}</td>
          <td>${rowData[4] || '-'}</td>
          <td>${rowData[5] || '-'}</td>
          <td class="text-center">
            <button class="btn btn-sm btn-outline-primary me-2" onclick='editPO(${rowNum}, ${JSON.stringify(rowData).replace(/"/g, '&quot;')})'>
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteRow('PO_Customer', ${rowNum})">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    })
    .getSheetRawData('PO_Customer');
}

// ฟังก์ชันเตรียมข้อมูลเพื่อแก้ไข (ส่งเข้าช่องกรอกข้อมูล) — ใช้คู่กับ loadPOData เดิม
function editPO(rowNum, rowData) {
  document.querySelector('[name="rowNum"]').value = rowNum;
  document.querySelector('[name="Brand"]').value = rowData[1];
  document.querySelector('[name="PO"]').value = rowData[2];
  document.querySelector('[name="ผลิตภัณฑ์"]').value = rowData[3];
  document.querySelector('[name="ยอดรวม"]').value = rowData[4];
  document.querySelector('[name="TfcCode"]').value = rowData[5];
  
  document.querySelector('button.btn-primary').innerText = "อัปเดตข้อมูล PO";
}

  // ========================================================
  // ตั้งค่าให้โหลดข้อมูลหน้าแรกทันทีที่เปิดแอป
  // ========================================================
  function loadDashboardPOData() {

  google.script.run
    .withSuccessHandler(function(data){
      _poData = data;
      updatePOSummary(data);
      renderTop5PO(data);
      renderAlertPO(data);
      updateOverallProgress(data);
    })
    .getPOTrackingReport();
}
window.onload = function() {
  if (typeof refreshDashboard === "function") {
    refreshDashboard();
  }
  loadDashboardPOData?.();
  loadLatestProduction?.();
  loadProduction7Days?.();
};
  
  // ระบบประมวลผลคำนวณสูตรและวาดแผนภูมิหน้าบอร์ด (เวอร์ชันเพิ่ม %Yield)
function refreshDashboard() {
  google.script.run
    .withSuccessHandler(res => {
      // 1. ดึงค่าพ่นลงคาร์ดแดชบอร์ดเดิมของคุณ
      if(document.getElementById('d-total')) document.getElementById('d-total').innerText = (res.grandTotal || 0).toLocaleString();
      if(document.getElementById('d-p6')) document.getElementById('d-p6').innerText = (res.pack6 || 0).toLocaleString();
      if(document.getElementById('d-p24')) document.getElementById('d-p24').innerText = (res.pack24 || 0).toLocaleString();
      if(document.getElementById('d-orders')) document.getElementById('d-orders').innerText = (res.totalOrders || 0).toLocaleString();

      // 🔍 Debug: แสดง error/สถานะการดึงข้อมูลจริงบนหน้าเว็บ (ลบออกได้เมื่อแก้เสร็จแล้ว)
      const dbgBox = document.getElementById('d-debug');
      if (dbgBox && res._debug) {
        dbgBox.innerHTML = res._debug.map(function(line) {
          const isError = line.indexOf('ERROR') !== -1;
          return '<div style="color:' + (isError ? '#dc2626' : '#16a34a') + '">' + line + '</div>';
        }).join('');
      }
      
      // 🎯 2. เพิ่มระบบคำนวณ %Yield อัตโนมัติจากค่าในโมเดล res
      const yieldElement = document.getElementById('d-yield');
      if (yieldElement) {
        const totalBottles = parseFloat(res.grandTotal) || 0;
        const totalWaste = parseFloat(res.totalWaste || res.waste || 0); 
        
        let yieldPercent = 0;
        if (totalBottles > 0) {
          const goodBottles = totalBottles - totalWaste;
          yieldPercent = (goodBottles / totalBottles) * 100;
        }
        
        yieldElement.innerText = yieldPercent.toFixed(2) + "%";
        
        if (yieldPercent >= 95) {
          yieldElement.className = "fw-bold text-success mt-2 mb-0";
        } else if (yieldPercent >= 85) {
          yieldElement.className = "fw-bold text-warning mt-2 mb-0";
        } else {
          yieldElement.className = "fw-bold text-danger mt-2 mb-0";
        }
      }
      
      // 3. วาดกราฟ Chart.js โครงสร้างเดิมของคุณตามปกติ
      const ctx = document.getElementById('mainChart');
      if (ctx) {
        const context = ctx.getContext('2d');
        if (mainChart !== null && typeof mainChart.destroy === 'function') { mainChart.destroy(); }
        mainChart = new Chart(context, {
          type: 'bar',
          data: {
            labels: ['Pack 6', 'Pack Tray 24'],
            datasets: [{
              data: [Number(res.pack6) * 6, Number(res.pack24) * 24],
              backgroundColor: ['#f1c40f', '#3498db'],
              borderWidth: 1
            }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
      }
    }).getDashboardData();

  // ดึงตารางสถานะและคำนวณสูตรค้างส่งเดิมของคุณ
  const dashTableBody = document.getElementById('dash-po-report-body');
  if (dashTableBody) {
    google.script.run
      .withSuccessHandler(data => {
        if (!data || data.length === 0) {
          dashTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">ไม่พบข้อมูลใบสั่งซื้อ PO ค้างส่ง</td></tr>';
          return;
        }
        dashTableBody.innerHTML = data.map(item => {
          let statusText = "";
          let fmtDiff = Math.abs(item.diffQty || 0).toLocaleString();
          
          if (item.diffQty === 0) {
            statusText = `<span class="badge bg-success w-100">ครบพอดี</span>`;
          } else if (item.diffQty > 0) {
            statusText = `<span class="badge bg-danger text-wrap w-100">ขาดอีก ${fmtDiff} Tray</span>`;
          } else {
            statusText = `<span class="badge bg-warning text-dark text-wrap w-100">เกินแผน ${fmtDiff} Tray</span>`;
          }
          
          return `
            <tr>
              <td><b>${item.brand || '-'}</b></td>
              <td><code>${item.po || '-'}</code></td>
              <td><span class="badge bg-secondary">${item.product || '-'}</span></td>
              <td class="text-end">${(item.targetQty || 0).toLocaleString()}</td>
              <td class="text-end text-success fw-bold">${(item.actualQty || 0).toLocaleString()}</td>
              <td>${statusText}</td>
            </tr>
          `;
        }).join('');
      }).getPOSummaryReport();
  }
}

function loadPOStatusTable() {
  const tbodyStatus = document.getElementById('t-PO_Status');
  if (!tbodyStatus) return;

  google.script.run
    .withSuccessHandler(function(mappedData) {
      tbodyStatus.innerHTML = '';
      if (!mappedData || mappedData.length === 0) {
        tbodyStatus.innerHTML = `<tr><td colspan="7" class="text-center text-muted">ไม่พบข้อมูลประวัติ PO</td></tr>`;
        return;
      }

      document.getElementById('po-status-count').innerText = `${mappedData.length} รายการ`;

      mappedData.forEach(function(item) {
        
        const poNo      = item.poNo;
        const customer  = `${item.brand} - ${item.product}`;
        const orderQty  = item.orderQty;
        const packedQty = item.packedQty;
        
        const balance = orderQty - packedQty;
        let percent = orderQty > 0 ? Math.round((packedQty / orderQty) * 100) : 0;
        if (percent > 100) percent = 100;

        let badgeHTML = '';
        let progressColor = 'bg-primary';

        if (percent === 0) {
          badgeHTML = `<span class="badge bg-secondary text-white">ยังไม่เริ่ม</span>`;
          progressColor = 'bg-secondary';
        } else if (percent < 100) {
          badgeHTML = `<span class="badge bg-warning text-dark">กำลังแพ็ค</span>`;
          progressColor = 'bg-warning';
        } else {
          badgeHTML = `<span class="badge bg-success text-white">ครบถ้วน</span>`;
          progressColor = 'bg-success';
        }

        let balanceHTML = '';
        if (balance > 0) {
          balanceHTML = `<span class="text-danger fw-bold">ค้าง ${balance.toLocaleString()}</span>`;
        } else if (balance < 0) {
          balanceHTML = `<span class="text-success fw-bold">เกิน ${Math.abs(balance).toLocaleString()}</span>`;
        } else {
          balanceHTML = `<span class="text-success fw-bold">ครบ</span>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="fw-medium">${item.tfcCode}</td>
          <td class="fw-medium">${poNo}</td>
          <td>${customer}</td>
          <td class="text-end fw-bold text-dark">${orderQty.toLocaleString()}</td>
          <td class="text-end text-primary fw-bold">${packedQty.toLocaleString()}</td>
          <td class="text-end">${balanceHTML}</td>
          <td>
            <div class="d-flex align-items-center">
              <div class="progress flex-grow-1 me-2" style="height: 10px;">
                <div class="progress-bar progress-bar-striped progress-bar-animated ${progressColor}" role="progressbar" style="width: ${percent}%;"></div>
              </div>
              <small class="fw-bold" style="width: 35px; text-align: right;">${percent}%</small>
            </div>
          </td>
          <td class="text-center">${badgeHTML}</td>
        `;
        tbodyStatus.appendChild(tr);
      });
    })
    .withFailureHandler(function(error) {
      console.error(error);
      tbodyStatus.innerHTML = `<tr><td colspan="7" class="text-center text-danger">❌ เกิดข้อผิดพลาด: ${error.message || error}</td></tr>`;
    })
    .getPOTrackingData();
}

// ประกาศตัวแปรส่วนกลางเก็บรายชื่อ PO ทั้งหมด
let globalPOList = [];

document.addEventListener("DOMContentLoaded", function () {
  fetchAndRenderPOOptions();
});

function fetchAndRenderPOOptions() {
  google.script.run.withSuccessHandler(function(poList) {
    if (poList && poList.length > 0) {
      globalPOList = poList;
      
      var poDropdowns = document.querySelectorAll('.po-dropdown-select');
      poDropdowns.forEach(function(dropdown) {
        var currentValue = dropdown.value;
        dropdown.innerHTML = '<option value="">-- เลือกเลขที่ PO / Order --</option>';
        globalPOList.forEach(function(po) {
          var option = document.createElement('option');
          option.value = po;
          option.innerText = po;
          dropdown.appendChild(option);
        });
        if (currentValue) dropdown.value = currentValue;
      });

      initPackSearchDropdowns();
    }
  }).getActivePOList();
}

let globalProductList = [];

document.addEventListener("DOMContentLoaded", function () {
  fetchAndRenderProductOptions();
});

function fetchAndRenderProductOptions() {
  const manualProductList = ["OR", "CM", "MG", "BN", "CN", "BK", "LOWSugar", "GT"];
  
  console.log("📦 กำลังโหลดรายการผลิตภัณฑ์แบบแมนนวลจำนวน:", manualProductList.length, "รายการ");
  
  const productDropdowns = document.querySelectorAll('.product-dropdown-select');
  
  productDropdowns.forEach(dropdown => {
    const currentValue = dropdown.value; 
    
    dropdown.innerHTML = '<option value="">-- เลือกผลิตภัณฑ์ --</option>';
    
    manualProductList.forEach(prod => {
      const option = document.createElement('option');
      option.value = prod;
      option.innerText = prod;
      dropdown.appendChild(option);
    });
    
    if (currentValue) dropdown.value = currentValue;
  });
}

document.addEventListener('DOMContentLoaded', function() {
  loadDashboardChart();
});
function loadDashboardChart() {
  google.script.run.withSuccessHandler(function(data) {
    if (!data || data.length === 0) return;
    
    var ctxEl = document.getElementById('poChart');
    if (!ctxEl) return;

    const ctx = ctxEl.getContext('2d');
    
    const minHeight = Math.max(data.length * 40, 300);
    ctxEl.parentNode.style.height = minHeight + 'px';

    if (window.myChart) window.myChart.destroy();

    window.myChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(i => i.label),
        datasets: [
          { label: 'แผน (Target)',  data: data.map(i => i.target), backgroundColor: '#CED4DA', borderRadius: 2 },
          { label: 'จำนวนที่ได้จริง (Actual)', data: data.map(i => i.actual), backgroundColor: '#198754', borderRadius: 2 }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          datalabels: {
            display: function(context) { return context.dataset.data[context.dataIndex] > 0; },
            color: '#000',
            anchor: 'end',
            align: 'right',
            offset: 5,
            font: { weight: 'bold', size: 11 },
            formatter: function(value) { return value.toLocaleString(); }
          }
        },
        layout: { padding: { right: 40 } },
        scales: { x: { beginAtZero: true } }
      }
    });
  }).getDashboardChartData();
}

window.addEventListener('load', function() {
  refreshDashboard();
  loadDashboardChart();
  
  ['Summary', 'Pack6', 'Pack24', 'Bottles', 'Packaging_Stock', 
   'WIP_Product', 'WIP_Packaging', 'Waste', 'RD_Sample', 'PO_Customer'].forEach(function(name) {
    if (document.getElementById('t-' + name)) {
      loadData(name);
    }
  });
});
//------------------------------------------------ติดตาม PO---------------------------------------------------------------------
var _poData = [];

function loadPOTracking() {
  var tbody = document.getElementById('po-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:#64748b">กำลังโหลด...</td></tr>';

  google.script.run
    .withSuccessHandler(function(list) {
      var sel = document.getElementById('po-search');
      if (!sel) return;
      sel.innerHTML = '<option value="">-- ทุก PO --</option>';
      list.forEach(function(item) {
        sel.innerHTML += '<option value="' + item.po + '">' + item.po + ' (' + item.brand + ')</option>';
      });
    })
    .getPOList();

  google.script.run
    .withSuccessHandler(function(data) {
     _poData = data;
      renderPOTable(data);
      renderTop5PO(data);
    })
    .withFailureHandler(function(err) {
      document.getElementById('po-body').innerHTML =
        '<tr><td colspan="9" style="text-align:center;color:#dc2626;padding:20px">โหลดไม่สำเร็จ: ' + (err.message||err) + '</td></tr>';
    })
    .getPOTrackingReport();
}
function renderPOTable(data) {
  var tbody = document.getElementById('po-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:#64748b">ไม่พบข้อมูล</td></tr>';
    updatePOSummary([]);
    return;
  }

  data.forEach(function(row) {
    var statusColor = row[7] === 'ครบแล้ว'    ? '#d1fae5;color:#065f46' :
                      row[7] === 'ใกล้ครบ'     ? '#fef3c7;color:#92400e' :
                      row[7] === 'กำลังผลิต'   ? '#dbeafe;color:#1d4ed8' :
                      '#fee2e2;color:#991b1b';

    var pct    = parseFloat(row[6]) || 0;
    var pctBar = Math.min(pct, 100);
    var barColor = pct >= 100 ? '#16a34a' : pct >= 80 ? '#f59e0b' : '#2563eb';

    var diff     = Number(row[5]);
    var diffText = diff <= 0
      ? '<span style="color:#16a34a;font-weight:600">+' + Math.abs(diff).toLocaleString() + '</span>'
      : '<span style="color:#dc2626;font-weight:600">-' + diff.toLocaleString() + '</span>';

    var rowBg = row[7] === 'ครบแล้ว' ? '' : row[7] === 'ยังไม่เริ่ม' ? 'background:#fef2f2' : '';

    var tr = document.createElement('tr');
    tr.setAttribute('data-status', row[7]);
    tr.setAttribute('data-search', (row[0]+row[1]+row[2]+row[8]).toLowerCase());
    if (rowBg) tr.style.cssText = rowBg;

    tr.innerHTML =
      '<td><span style="background:#eff6ff;color:#1d4ed8;padding:2px 8px;border-radius:20px;font-size:12px;font-weight:500">' + (row[0]||'') + '</span></td>' +
      '<td style="font-weight:600;color:#1e293b">' + (row[1]||'') + '</td>' +
      '<td>' + (row[2]||'') + '</td>' +
      '<td style="text-align:right;font-weight:500">' + Number(row[3]).toLocaleString() + '</td>' +
      '<td style="text-align:right;font-weight:600;color:#2563eb">' + Number(row[4]).toLocaleString() + '</td>' +
      '<td style="text-align:right">' + diffText + '</td>' +
      '<td style="text-align:center">' +
        '<div style="display:flex;align-items:center;gap:6px">' +
          '<div style="flex:1;height:6px;background:#e2e8f0;border-radius:4px;overflow:hidden">' +
            '<div style="width:' + pctBar + '%;height:100%;background:' + barColor + ';border-radius:4px"></div>' +
          '</div>' +
          '<span style="font-size:12px;font-weight:600;min-width:38px">' + pct + '%</span>' +
        '</div>' +
      '</td>' +
      '<td style="text-align:center"><span style="background:' + statusColor + ';padding:2px 10px;border-radius:20px;font-size:12px;font-weight:500">' + (row[7]||'') + '</span></td>' +
      '<td style="color:#64748b;font-size:12px">' + (row[8]||'') + '</td>';
    tbody.appendChild(tr);
  });

  updatePOSummary(data);
}

function updatePOSummary(data) {
  var total    = data.length;
  var done     = data.filter(function(r) { return r[7] === 'ครบแล้ว'; }).length;
  var inprog   = data.filter(function(r) { return r[7] === 'กำลังผลิต' || r[7] === 'ใกล้ครบ'; }).length;
  var notstart = data.filter(function(r) { return r[7] === 'ยังไม่เริ่ม'; }).length;

  var elTotal    = document.getElementById('po-total-count');
  var elDone     = document.getElementById('po-done');
  var elInprog   = document.getElementById('po-inprog');
  var elNotstart = document.getElementById('po-notstart');

  if (elTotal)    elTotal.textContent    = total;
  if (elDone)     elDone.textContent     = done;
  if (elInprog)   elInprog.textContent   = inprog;
  if (elNotstart) elNotstart.textContent = notstart;
   updateOverallProgress(data);
}
function loadTop5Dashboard() {
  console.log("🔥 loadTop5Dashboard Start");
  const container =
    document.getElementById("top5-po-list");
  if (container) {
    container.innerHTML =
      '<div class="text-center text-muted py-3">กำลังโหลด...</div>';
  }
  google.script.run
    .withSuccessHandler(function(data){
      renderTop5PO(data);
    })
    .withFailureHandler(function(err){
      container.innerHTML =
        '<div class="text-danger">โหลดข้อมูลไม่สำเร็จ</div>';
      console.error(err);
    })
    .getPOTrackingReport();
}
function renderTop5PO(data) {
  var container =
    document.getElementById('top5-po-list');
  if (!container) return;
  container.innerHTML = '';
  var top5 = data
    .filter(function(r) {

      var pct = parseFloat(r[6]) || 0;

      return pct < 100;
    })
    .sort(function(a,b) {

      return b[6] - a[6];
    })
    .slice(0,5);
  if (top5.length === 0) {
    container.innerHTML =
      '<div class="text-success">✅ ทุก Order ครบแล้ว</div>';
    return;
  }
  top5.forEach(function(r){
    var pct = parseFloat(r[6]) || 0;
    var color =
      pct >= 95 ? '#16a34a' :
      pct >= 80 ? '#f59e0b' :
      '#2563eb';
    container.innerHTML +=
    '<div style="margin-bottom:14px">' +
      '<div style="display:flex;justify-content:space-between">' +
        '<strong>' + r[1] + '</strong>' +
        '<span>' + pct.toFixed(1) + '%</span>' +
      '</div>' +
      '<div style="height:8px;background:#e2e8f0;border-radius:20px;overflow:hidden;margin-top:4px">' +
        '<div style="' +
          'width:' + pct + '%;' +
          'height:100%;' +
          'background:' + color +
        '"></div>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;margin-top:6px">' +
      '<small style="color:#64748b">' + r[2] + '</small>' +
      '<small style="color:#dc2626;font-weight:600">เหลือ ' + Number(r[5]).toLocaleString() + '</small>' +
        '</div>' +
        '</div>';
  });
}
function filterPOTable() {
  var po     = document.getElementById('po-search') ? document.getElementById('po-search').value : '';
  var status = document.getElementById('po-filter-status') ? document.getElementById('po-filter-status').value : '';
  var filtered = _poData.filter(function(r) {
    var matchPO     = po === '' || r[1] === po;
    var matchStatus = status === '' || r[7] === status;
    return matchPO && matchStatus;
  });
  renderPOTable(filtered);
  renderTop5PO(filtered);
}
document.addEventListener('input', function(e) {
  if (e.target && e.target.id === 'po-search') filterPOTable();
});
//------------------------------------------------ติดตาม PO---------------------------------------------------------------------
function initPackSearchDropdowns() {
  ['search-pack6-order', 'search-pack24-order'].forEach(function(id) {
    var sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '<option value="">-- ทุก Order --</option>';
    globalPOList.forEach(function(po) {
      sel.innerHTML += '<option value="' + po + '">' + po + '</option>';
    });
  });
}

function searchPack6() {
  var order = document.getElementById('search-pack6-order').value.toLowerCase();
  var rows  = document.querySelectorAll('#t-Pack6 tr');
  rows.forEach(function(row) {
    if (!order) { row.style.display = ''; return; }
    var cells = row.querySelectorAll('td');
    var orderCell = cells[cells.length - 2];
    row.style.display = orderCell && orderCell.textContent.toLowerCase() === order ? '' : 'none';
  });
}

function resetSearchPack6() {
  document.getElementById('search-pack6-order').value = '';
  searchPack6();
}

function searchPack24() {
  var order = document.getElementById('search-pack24-order').value.toLowerCase();
  var rows  = document.querySelectorAll('#t-Pack24 tr');
  rows.forEach(function(row) {
    if (!order) { row.style.display = ''; return; }
    var cells     = row.querySelectorAll('td');
    var orderCell = cells[cells.length - 2];
    row.style.display = orderCell && orderCell.textContent.toLowerCase() === order ? '' : 'none';
  });
}

function resetSearchPack24() {
  document.getElementById('search-pack24-order').value = '';
  searchPack24();
}
//---------------------------------------------------------------------
function loadAlertPO() {
  google.script.run
    .withSuccessHandler(function(data){
      renderAlertPO(data);
    })
    .withFailureHandler(function(err){
      document.getElementById('alert-po-list').innerHTML =
        '<div class="text-danger">โหลดข้อมูลไม่สำเร็จ</div>';
      console.error(err);
    })
    .getPOTrackingReport();
}
function renderAlertPO(data) {
  const container =
    document.getElementById('alert-po-list');
  if (!container) return;
  container.innerHTML = '';
  const alerts = data
    .filter(function(r){
      const pct = parseFloat(r[6]) || 0;
      return pct < 50;
    })
    .sort(function(a,b){
      return a[6] - b[6];
    })
    .slice(0,5);
  if(alerts.length === 0){
    container.innerHTML =
      '<div class="alert alert-success mb-0">✅ ไม่มี Order ที่น่ากังวล</div>';
    return;
  }
  alerts.forEach(function(r){
    const pct = parseFloat(r[6]) || 0;
    container.innerHTML +=
      '<div class="d-flex justify-content-between align-items-center mb-2 p-2" ' +
      'style="background:#fef2f2;border-radius:10px">' +
        '<div>' +
          '<div style="font-weight:600">' + r[1] + '</div>' +
          '<small style="color:#64748b">' + r[2] + '</small>' +
        '</div>' +
        '<div style="text-align:right">' +
          '<div style="color:#dc2626;font-weight:700">' +
            pct.toFixed(1) + '%' +
          '</div>' +
          '<small style="color:#dc2626">' +
            'เหลือ ' + Number(r[5]).toLocaleString() +
          '</small>' +
        '</div>' +
      '</div>';
  });
}
//------------------------------------------------------------------------
function updateOverallProgress(data) {
  console.log("Progress Data =", data);
  let totalTarget = 0;
  let totalActual = 0;
  data.forEach(function(row){
    totalTarget += Number(row[3]) || 0;
    totalActual += Number(row[4]) || 0;
  });
  console.log("Target =", totalTarget);
  console.log("Actual =", totalActual);
  const progress =
    totalTarget > 0
      ? ((totalActual / totalTarget) * 100)
      : 0;
  document.getElementById('po-progress-total').textContent =
    progress.toFixed(1) + '%';
}
//---------------------------------------
function loadLatestProduction() {
  google.script.run.withSuccessHandler(function(res){
        document.getElementById(
        "latest-production"
      ).textContent =
        Number(res.bottles)
          .toLocaleString()
        + " ขวด";
      document.getElementById(
        "latest-production-date"
      ).textContent =
        "📅 " + res.date;
    })
    .getLatestProduction();
}
//---------------------------------------
let productionChart = null;
function loadProduction7Days() {
  google.script.run.withSuccessHandler(function(data){
      renderProduction7DaysChart(data);
    })
    .getProduction7Days();
}
function renderProduction7DaysChart(data) {
  const ctx =document.getElementById("production7DayChart");
  if (!ctx) return;
  const labels = data.map(function(r){
    return r.date.substring(5);
  });
const values = data.map(function(r){
  return r.bottles;
});
const avg = values.length
  ? Math.round(
      values.reduce((a,b)=>a+b,0) / values.length
    )
  : 0;
console.log("AVG =", avg);
const avgEl = document.getElementById("avg-production");
if(avgEl){
  avgEl.textContent = avg.toLocaleString();
} 
  if (productionChart) {
    productionChart.destroy();
  }
  productionChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
              {
                label:'ผลิตจริง',
                data: values,
                borderColor:'#2563eb',
                borderWidth:4,
                backgroundColor:'rgba(37,99,235,.08)',
                fill:true,
                tension:.45,
                pointRadius:5,
                pointHoverRadius:8
              },
              {
                label:'เป้าหมาย',
                data:Array(labels.length).fill(20000),
                borderColor:'#ef4444',
                borderDash:[8,6],
                borderWidth:2,
                pointRadius:0,
                fill:false
              }
              ]
      },
    options: {
      responsive: true,
      plugins: {
         datalabels: {
                color: '#0f172a',
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderRadius: 6,
                padding: 4,
                font: {
                  size: 11,
                  weight: 'bold'
                },
                anchor: 'end',
                align: 'top',
                offset: 8,
                formatter: function(value) {
                  return value.toLocaleString();
                }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return value.toLocaleString();
            }
          }
        }
      }
    }
  });
}
//--------------------------------
