export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * קוד Google Apps Script לסנכרון דו-כיווני מלא של אישורי הגעה מבת המצווה של אורי
 *
 * עמודות הגיליון (7 עמודות מדויקות):
 * 1. סוג (A)
 * 2. שם (B)
 * 3. שיר מבוקש (C)
 * 4. ברכה (D)
 * 5. תאריך אישור (E)
 * 6. מספר מגיעים (F)
 * 7. מזהה מערכת (G)
 *
 * מדריך עדכון / התקנה מהיר:
 * 1. פתחו את הגיליון ב-Google Sheets.
 * 2. בתפריט לחצו על "הרחבות" (Extensions) > "Apps Script".
 * 3. הדביקו את הקוד המעודכן במקום הקוד הישן.
 * 4. לחצו על "שמור" (סמל הדיסקט או Ctrl+S).
 * 5. למעלה לחצו על "פריסה" (Deploy) > "ניהול פריסות" (Manage deployments).
 * 6. לחצו על סמל העיפרון (Edit / עריכה) בצד שמאל.
 * 7. בשדה "גרסה" (Version) בחרו ב-"גרסה חדשה" (New version).
 * 8. לחצו על "פריסה" (Deploy). הקישור נשאר אותו קישור בדיוק!
 */

function doPost(e) {
  try {
    var sheet = getOrCreateRsvpSheet();
    var data = JSON.parse(e.postData.contents);
    
    // סנכרון דו-כיווני מרוכז (Batch Two-Way Sync)
    if (data.action === 'batchSync') {
      var syncedFromApp = 0;
      if (Array.isArray(data.rsvps)) {
        for (var i = 0; i < data.rsvps.length; i++) {
          upsertRsvpRow(sheet, data.rsvps[i]);
          syncedFromApp++;
        }
      }
      
      // קריאת כל השורות מהגיליון (כולל שורות שהוספתם ידנית בקובץ!)
      var sheetRows = readAllRowsAndAssignIds(sheet);
      
      return jsonResponse({
        success: true,
        message: 'סנכרון דו-כיווני בוצע בהצלחה',
        syncedCount: syncedFromApp,
        sheetRsvps: sheetRows
      });
    }
    
    // אישור הגעה בודד (נשלח ישירות בזמן אמת כשאורח מאשר באפליקציה)
    if (data.action === 'saveRsvp' || data.id) {
      upsertRsvpRow(sheet, data);
      return jsonResponse({ success: true, id: data.id, message: 'אישור ההגעה נשמר בגיליון' });
    }
    
    return jsonResponse({ success: false, error: 'פעולה לא מוכרת' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function doGet(e) {
  try {
    var sheet = getOrCreateRsvpSheet();
    var sheetRows = readAllRowsAndAssignIds(sheet);
    return jsonResponse({
      success: true,
      count: sheetRows.length,
      sheetRsvps: sheetRows
    });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// קריאת כל השורות מהגיליון. אם שורה נוספה ידנית ללא מזהה מערכת, מייצר עבורה מזהה ייחודי ושומר בגיליון!
function readAllRowsAndAssignIds(sheet) {
  var lastRow = sheet.getLastRow();
  var rows = [];
  if (lastRow <= 1) return rows;

  var range = sheet.getRange(2, 1, lastRow - 1, 7);
  var values = range.getValues();

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var rowIndex = i + 2;
    var name = String(row[1] || '').trim(); // עמודה B (שם)
    if (!name) continue; // דילוג על שורות ריקות

    var id = String(row[6] || '').trim(); // עמודה G (מזהה מערכת)
    // אם זו שורה שנוספה ידנית ישירות ב-Sheets ללא מזהה מערכת
    if (!id) {
      id = 'rsvp-sheet-' + new Date().getTime() + '-' + Math.floor(Math.random() * 10000);
      sheet.getRange(rowIndex, 7).setValue(id);
    }

    var countVal = parseInt(row[5], 10); // עמודה F (מספר מגיעים)
    if (isNaN(countVal) || countVal < 1) countVal = 1;

    rows.push({
      id: id,
      type: String(row[0] || 'חברה').trim(),
      name: name,
      combinedNames: name,
      songRequest: String(row[2] || '').trim(),
      wishingMessage: String(row[3] || '').trim(),
      formattedDate: String(row[4] || '').trim(),
      count: countVal,
      attending: 'מגיע/ה'
    });
  }

  return rows;
}

// עדכון שורה קיימת לפי מזהה מערכת או הוספת שורה חדשה בסוף הגיליון
function upsertRsvpRow(sheet, item) {
  var lastRow = sheet.getLastRow();
  var idColIndex = 7; // עמודה G: מזהה מערכת
  var targetRow = -1;

  if (lastRow > 1) {
    var idValues = sheet.getRange(2, idColIndex, lastRow - 1, 1).getValues();
    for (var r = 0; r < idValues.length; r++) {
      if (item.id && String(idValues[r][0]) === String(item.id)) {
        targetRow = r + 2;
        break;
      }
    }
  }

  var rowData = [
    item.type || 'חברה',                                      // 1. סוג
    item.combinedNames || item.name || '',                    // 2. שם
    item.songRequest || '',                                   // 3. שיר מבוקש
    item.wishingMessage || '',                                // 4. ברכה
    item.formattedDate || new Date().toLocaleString('he-IL'),  // 5. תאריך אישור
    item.count || 1,                                          // 6. מספר מגיעים
    item.id || ''                                             // 7. מזהה מערכת
  ];

  if (targetRow > 0) {
    sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
    var newRow = sheet.getLastRow();
    sheet.getRange(newRow, 1, 1, rowData.length).setHorizontalAlignment('right');
  }
}

// יצירת הגיליון והכותרות בעיצוב ירוק זית אלגנטי
function getOrCreateRsvpSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('אישורי הגעה') || ss.getActiveSheet();
  if (sheet.getName() !== 'אישורי הגעה') {
    sheet.setName('אישורי הגעה');
  }
  
  // אם יש רק שורת כותרת ישנה עם טלפון/כשרות, נרענן אותה
  if (sheet.getLastRow() === 1) {
    var firstRow = sheet.getRange(1, 1, 1, Math.min(sheet.getLastColumn() || 1, 10)).getValues()[0];
    if (firstRow.indexOf('טלפון') !== -1 || sheet.getLastColumn() > 7) {
      sheet.clear();
    }
  }

  if (sheet.getLastRow() === 0) {
    var headers = [
      'סוג',
      'שם',
      'שיר מבוקש',
      'ברכה',
      'תאריך אישור',
      'מספר מגיעים',
      'מזהה מערכת'
    ];
    
    sheet.appendRow(headers);
    
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#3B5339');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setHorizontalAlignment('center');
    headerRange.setFontSize(11);
    
    sheet.setFrozenRows(1);
    sheet.setRightToLeft(true);
    
    sheet.setColumnWidth(1, 90);   // סוג
    sheet.setColumnWidth(2, 220);  // שם
    sheet.setColumnWidth(3, 180);  // שיר מבוקש
    sheet.setColumnWidth(4, 260);  // ברכה
    sheet.setColumnWidth(5, 160);  // תאריך אישור
    sheet.setColumnWidth(6, 110);  // מספר מגיעים
    sheet.setColumnWidth(7, 160);  // מזהה מערכת
  }
  
  return sheet;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// פונקציית בדיקה פנימית מתוך עורך Apps Script
function testTwoWaySync() {
  var sheet = getOrCreateRsvpSheet();
  Logger.log('שורות שנקראו מהגיליון: ' + JSON.stringify(readAllRowsAndAssignIds(sheet)));
}
`;
