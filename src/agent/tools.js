/**
 * Excel Agent 工具集
 * 直接调用 WPS API 操作表格
 */

// 列出所有工作表
export function list_sheets() {
    try {
        const wb = window.Application.ActiveWorkbook;
        if (!wb) return { error: "没有打开的工作簿" };
        
        const sheets = [];
        for (let i = 1; i <= wb.Sheets.Count; i++) {
            sheets.push(wb.Sheets.Item(i).Name);
        }
        return {
            workbook: wb.Name,
            sheets,
            active: window.Application.ActiveSheet.Name
        };
    } catch (e) {
        return { error: e.message };
    }
}

// 获取工作表信息
export function get_sheet_info(sheet_name = null) {
    try {
        const wb = window.Application.ActiveWorkbook;
        if (!wb) return { error: "没有打开的工作簿" };
        
        const sheet = sheet_name ? wb.Sheets.Item(sheet_name) : window.Application.ActiveSheet;
        const usedRange = sheet.UsedRange;
        
        // 读取表头
        const headers = [];
        const firstRow = usedRange.Rows.Item(1);
        for (let i = 1; i <= Math.min(usedRange.Columns.Count, 20); i++) {
            const val = firstRow.Cells.Item(1, i).Value2;
            if (val) headers.push(String(val));
        }
        
        return {
            name: sheet.Name,
            rows: usedRange.Rows.Count,
            cols: usedRange.Columns.Count,
            range: usedRange.Address(),
            headers
        };
    } catch (e) {
        return { error: e.message };
    }
}

// 读取数据范围
export function read_range(range_addr, sheet_name = null) {
    try {
        const wb = window.Application.ActiveWorkbook;
        if (!wb) return { error: "没有打开的工作簿" };
        
        const sheet = sheet_name ? wb.Sheets.Item(sheet_name) : window.Application.ActiveSheet;
        const range = sheet.Range(range_addr);
        
        const data = [];
        const rows = range.Rows.Count;
        const cols = range.Columns.Count;
        
        for (let r = 1; r <= rows; r++) {
            const row = [];
            for (let c = 1; c <= cols; c++) {
                let val = range.Cells.Item(r, c).Value2;
                // 处理日期
                if (typeof val === 'number' && val > 25569 && val < 50000) {
                    // 可能是日期
                    const text = range.Cells.Item(r, c).Text;
                    if (text && text.includes('-')) val = text;
                }
                row.push(val);
            }
            data.push(row);
        }
        
        return { range: range_addr, rows, cols, data };
    } catch (e) {
        return { error: e.message };
    }
}

// 搜索单元格
export function search(keyword) {
    try {
        const wb = window.Application.ActiveWorkbook;
        if (!wb) return { error: "没有打开的工作簿" };
        
        const results = [];
        const maxResults = 20;
        
        for (let s = 1; s <= wb.Sheets.Count && results.length < maxResults; s++) {
            const sheet = wb.Sheets.Item(s);
            const usedRange = sheet.UsedRange;
            
            for (let r = 1; r <= usedRange.Rows.Count && results.length < maxResults; r++) {
                for (let c = 1; c <= usedRange.Columns.Count && results.length < maxResults; c++) {
                    const cell = usedRange.Cells.Item(r, c);
                    const val = cell.Value2;
                    if (val && String(val).includes(keyword)) {
                        results.push({
                            sheet: sheet.Name,
                            cell: cell.Address(),
                            value: String(val)
                        });
                    }
                }
            }
        }
        
        return { keyword, count: results.length, results };
    } catch (e) {
        return { error: e.message };
    }
}

// 写入单元格
export function write_cell(cell_addr, value, sheet_name = null) {
    try {
        const wb = window.Application.ActiveWorkbook;
        if (!wb) return { error: "没有打开的工作簿" };
        
        const sheet = sheet_name ? wb.Sheets.Item(sheet_name) : window.Application.ActiveSheet;
        sheet.Range(cell_addr).Value2 = value;
        
        return { success: true, cell: cell_addr, value };
    } catch (e) {
        return { error: e.message };
    }
}

// 批量写入
export function write_range(start_cell, data, sheet_name = null) {
    try {
        const wb = window.Application.ActiveWorkbook;
        if (!wb) return { error: "没有打开的工作簿" };
        
        const sheet = sheet_name ? wb.Sheets.Item(sheet_name) : window.Application.ActiveSheet;
        const startRange = sheet.Range(start_cell);
        const startRow = startRange.Row;
        const startCol = startRange.Column;
        
        for (let r = 0; r < data.length; r++) {
            for (let c = 0; c < data[r].length; c++) {
                sheet.Cells.Item(startRow + r, startCol + c).Value2 = data[r][c];
            }
        }
        
        return { success: true, start: start_cell, rows: data.length, cols: data[0]?.length || 0 };
    } catch (e) {
        return { error: e.message };
    }
}

// 插入公式
export function insert_formula(cell_addr, formula, sheet_name = null) {
    try {
        const wb = window.Application.ActiveWorkbook;
        if (!wb) return { error: "没有打开的工作簿" };
        
        const sheet = sheet_name ? wb.Sheets.Item(sheet_name) : window.Application.ActiveSheet;
        sheet.Range(cell_addr).Formula = formula;
        
        return { success: true, cell: cell_addr, formula };
    } catch (e) {
        return { error: e.message };
    }
}

// 填充公式
export function fill_formula(start_cell, end_cell, sheet_name = null) {
    try {
        const wb = window.Application.ActiveWorkbook;
        if (!wb) return { error: "没有打开的工作簿" };
        
        const sheet = sheet_name ? wb.Sheets.Item(sheet_name) : window.Application.ActiveSheet;
        const sourceRange = sheet.Range(start_cell);
        const fillRange = sheet.Range(start_cell + ":" + end_cell);
        
        sourceRange.AutoFill(fillRange);
        
        return { success: true, start: start_cell, end: end_cell };
    } catch (e) {
        return { error: e.message };
    }
}

// 工具注册表
export const TOOLS = {
    list_sheets: { fn: list_sheets, desc: "列出所有工作表" },
    get_sheet_info: { fn: get_sheet_info, desc: "获取工作表信息" },
    read_range: { fn: read_range, desc: "读取数据范围", args: ["range_addr"] },
    search: { fn: search, desc: "搜索单元格", args: ["keyword"] },
    write_cell: { fn: write_cell, desc: "写入单元格", args: ["cell_addr", "value"] },
    write_range: { fn: write_range, desc: "批量写入", args: ["start_cell", "data"] },
    insert_formula: { fn: insert_formula, desc: "插入公式", args: ["cell_addr", "formula"] },
    fill_formula: { fn: fill_formula, desc: "填充公式", args: ["start_cell", "end_cell"] },
};

// 执行工具
export function executeTool(name, args = {}) {
    const tool = TOOLS[name];
    if (!tool) return { error: `未知工具: ${name}` };
    
    try {
        return tool.fn(...Object.values(args));
    } catch (e) {
        return { error: e.message };
    }
}
