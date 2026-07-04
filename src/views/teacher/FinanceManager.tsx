import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, TrendingDown, Wallet, FileText, 
  PlusCircle, List, ArrowLeft, Loader2, 
  Database, X, 
  Printer, Upload, ChevronLeft, 
  ChevronRight, 
  HelpCircle, FileSpreadsheet, DollarSign, Plus,
  Info, CheckCircle, Download
} from 'lucide-react';
import { supabase } from '../../services/firebaseConfig';
import { Teacher } from '../../types';

// --- Internal Types for Finance ---
interface FinanceAccount {
    id: string;
    schoolId: string;
    name: string;
    type: 'Budget' | 'NonBudget';
}

interface Transaction {
    id: string;
    schoolId: string;
    accountId: string;
    date: string;
    description: string;
    amount: number;
    type: 'Income' | 'Expense';
}

// Declare XLSX for use with CDN version
declare const XLSX: any;

// Thai Date Helper
const getThaiDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
};

const parseExcelDate = (raw: any): string => {
    if (!raw) return new Date().toISOString().split('T')[0];
    if (typeof raw === 'number') {
        const date = new Date(Math.round((raw - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
    }
    const str = String(raw).trim();
    if (str.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        const parts = str.split('/');
        const d = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        let y = parseInt(parts[2]);
        if (y > 2400) y -= 543;
        return `${y}-${m}-${d}`;
    }
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
    return new Date().toISOString().split('T')[0];
};

const FinanceManager: React.FC = () => {
    const [teacher, setTeacher] = useState<Teacher | null>(null);
    const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'Budget' | 'NonBudget'>('Budget');
    const [viewMode, setViewMode] = useState<'DASHBOARD' | 'DETAIL' | 'PRINT'>('DASHBOARD');
    const [selectedAccount, setSelectedAccount] = useState<FinanceAccount | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 15;

    // UI States
    const [showTransForm, setShowTransForm] = useState(false);
    const [showAccountForm, setShowAccountForm] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [showImportHelp, setShowImportHelp] = useState(false);

    // Form Data
    const [newTrans, setNewTrans] = useState({ date: new Date().toISOString().split('T')[0], desc: '', amount: '', type: 'Income' });
    const [newAccountForm, setNewAccountForm] = useState({ name: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const teacherId = localStorage.getItem('MST_TEACHER_ID');
            if (teacherId) {
                const { data: tData } = await supabase.from('teachers').select('*').eq('id', teacherId).single();
                if (tData) setTeacher(tData);

                const accRes = await supabase.from('finance_accounts').select('*').eq('school_id', tData.school);
                const transRes = await supabase.from('finance_transactions').select('*').eq('school_id', tData.school);

                if (accRes.data) setAccounts(accRes.data as FinanceAccount[]);
                if (transRes.data) setTransactions(transRes.data as Transaction[]);
            }
        } catch (error) {
            console.error("Finance load error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!teacher || !newAccountForm.name) return;

        const newAcc = {
            id: `acc_${Date.now()}`,
            school_id: teacher.school,
            name: newAccountForm.name,
            type: activeTab
        };

        const { error } = await supabase.from('finance_accounts').insert(newAcc);
        if (!error) {
            setAccounts([...accounts, newAcc as unknown as FinanceAccount]);
            setShowAccountForm(false);
            setNewAccountForm({ name: '' });
        } else {
            alert("บันทึกบัญชีไม่สำเร็จ");
        }
    };

    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        const acc = selectedAccount || accounts.find(a => a.type === 'NonBudget');
        if (!teacher || !acc || !newTrans.desc || !newTrans.amount) return;

        const transData = {
            id: `tx_${Date.now()}`,
            school_id: teacher.school,
            account_id: acc.id,
            date: newTrans.date,
            description: newTrans.desc,
            amount: parseFloat(newTrans.amount),
            type: newTrans.type
        };

        const { error } = await supabase.from('finance_transactions').insert(transData);
        if (!error) {
            setTransactions([...transactions, transData as unknown as Transaction]);
            setShowTransForm(false);
            setNewTrans({ date: new Date().toISOString().split('T')[0], desc: '', amount: '', type: 'Income' });
        } else {
            alert("บันทึกรายการไม่สำเร็จ");
        }
    };

    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !teacher) return;
        const file = e.target.files[0];
        setIsImporting(true);

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const rawData = XLSX.utils.sheet_to_json(ws);

                const batchTransactions: any[] = [];
                const newAccounts: any[] = [];
                const accountMap = new Map<string, string>();
                accounts.forEach(a => accountMap.set(a.name.trim(), a.id));

                let successCount = 0;

                for (const row of rawData as any[]) {
                    const normalizedRow: any = {};
                    Object.keys(row).forEach(key => normalizedRow[key.trim()] = row[key]);

                    const dateRaw = normalizedRow['วันที่'] || normalizedRow['Date'];
                    const accNameRaw = normalizedRow['ชื่อบัญชี'] || normalizedRow['Account'];
                    const descRaw = normalizedRow['รายการ'] || normalizedRow['Description'];
                    const amountRaw = normalizedRow['จำนวนเงิน'] || normalizedRow['Amount'];
                    const typeRaw = normalizedRow['ประเภท'] || normalizedRow['Type'];

                    if (!accNameRaw || !descRaw || !amountRaw) continue;

                    const cleanAccName = String(accNameRaw).trim();
                    let targetAccId = accountMap.get(cleanAccName);

                    if (!targetAccId) {
                        const newId = `acc_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                        const newAcc = {
                            id: newId,
                            school_id: teacher.school,
                            name: cleanAccName,
                            type: activeTab
                        };
                        newAccounts.push(newAcc);
                        accountMap.set(cleanAccName, newId);
                        targetAccId = newId;
                    }

                    batchTransactions.push({
                        id: `tx_imp_${Date.now()}_${successCount}`,
                        school_id: teacher.school,
                        account_id: targetAccId,
                        date: parseExcelDate(dateRaw),
                        description: String(descRaw),
                        amount: parseFloat(String(amountRaw).replace(/,/g, '')),
                        type: String(typeRaw).includes('ถอน') || String(typeRaw).includes('จ่าย') ? 'Expense' : 'Income'
                    });
                    successCount++;
                }

                if (newAccounts.length > 0) {
                    await supabase.from('finance_accounts').insert(newAccounts);
                }
                if (batchTransactions.length > 0) {
                    await supabase.from('finance_transactions').insert(batchTransactions);
                }

                alert(`นำเข้าข้อมูลสำเร็จ ${successCount} รายการ`);
                loadData();
            } catch (err) {
                console.error(err);
                alert("เกิดข้อผิดพลาดในการนำเข้าไฟล์");
            } finally {
                setIsImporting(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleDownloadTemplate = () => {
        const data = [
            ["วันที่", "ชื่อบัญชี", "รายการ", "ประเภท", "จำนวนเงิน"],
            ["12/05/2567", "เงินรายได้สถานศึกษา", "รับเงินบริจาค", "รายรับ", "5000"],
            ["15/05/2567", "เงินรายได้สถานศึกษา", "ซื้ออุปกรณ์กีฬา", "รายจ่าย", "1200"]
        ];
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "FinanceTemplate");
        XLSX.writeFile(wb, "MST_Finance_Template.xlsx");
    };

    const getAccountBalance = (accId: string) => {
        const accTrans = transactions.filter(t => t.accountId === accId);
        const income = accTrans.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
        const expense = accTrans.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
        return income - expense;
    };

    const renderDashboard = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <Wallet className="text-indigo-600" size={28}/> ระบบบริหารการเงิน
                    </h2>
                    <p className="text-sm text-slate-500 font-bold mt-1 uppercase tracking-tight">Financial & Budget Management</p>
                </div>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto shadow-inner">
                    <button onClick={() => {setActiveTab('Budget'); setViewMode('DASHBOARD');}} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'Budget' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}><DollarSign size={18}/> เงินงบประมาณ</button>
                    <button onClick={() => {setActiveTab('NonBudget'); setViewMode('DASHBOARD');}} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'NonBudget' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}><Wallet size={18}/> เงินนอกงบประมาณ</button>
                </div>
            </div>

            <div className="flex justify-end gap-3">
                <button onClick={() => setShowImportHelp(true)} className="p-2.5 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition shadow-sm"><HelpCircle size={22}/></button>
                <div className="relative">
                    <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="bg-emerald-600 text-white px-6 py-2.5 rounded-2xl font-black shadow-lg hover:bg-emerald-700 transition flex items-center gap-2 text-sm border-b-4 border-emerald-800">
                        {isImporting ? <Loader2 className="animate-spin" size={18}/> : <Upload size={18}/>} นำเข้า Excel
                    </button>
                </div>
                <button onClick={() => setShowAccountForm(true)} className="bg-indigo-600 text-white px-6 py-2.5 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition flex items-center gap-2 text-sm border-b-4 border-indigo-800">
                    <PlusCircle size={18}/> เพิ่มบัญชีใหม่
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts.filter(a => a.type === activeTab).map((acc, idx) => {
                    const bal = getAccountBalance(acc.id);
                    const colors = [
                        'from-blue-500 to-indigo-600', 'from-emerald-500 to-teal-600', 
                        'from-orange-500 to-amber-600', 'from-purple-500 to-violet-600',
                        'from-rose-500 to-pink-600', 'from-cyan-500 to-sky-600'
                    ];
                    return (
                        <button 
                            key={acc.id} 
                            onClick={() => { setSelectedAccount(acc); setViewMode('DETAIL'); }}
                            className="bg-white rounded-[35px] border-2 border-slate-50 p-6 text-left shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden border-b-[8px]"
                        >
                            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full bg-gradient-to-br ${colors[idx % colors.length]} opacity-5 group-hover:opacity-10 transition-all`}></div>
                            <div className="flex justify-between items-start mb-8">
                                <div className="p-4 bg-slate-50 text-indigo-600 rounded-2xl shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    <FileText size={24}/>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-slate-400 font-black uppercase tracking-widest">Balance</div>
                                    <div className="text-2xl font-black text-slate-800 tracking-tighter">฿{bal.toLocaleString()}</div>
                                </div>
                            </div>
                            <h3 className="text-lg font-black text-slate-700 line-clamp-2 min-h-[3rem] mb-2">{acc.name}</h3>
                            <div className="flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase">
                                <span>View History</span>
                                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                            </div>
                        </button>
                    )
                })}
                {accounts.filter(a => a.type === activeTab).length === 0 && (
                    <div className="col-span-full py-20 text-center bg-slate-50 rounded-[40px] border-4 border-dashed border-slate-200">
                        <Wallet size={60} className="mx-auto text-slate-200 mb-4 opacity-50"/>
                        <p className="text-lg font-black text-slate-400 italic">ยังไม่มีบัญชีในหมวดนี้ กรุณากดปุ่มเพิ่มบัญชีใหม่ หรือนำเข้าข้อมูล</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderDetail = () => {
        if (!selectedAccount) return null;
        const filtered = transactions.filter(t => t.accountId === selectedAccount.id).sort((a,b) => b.date.localeCompare(a.date));
        const income = filtered.filter(t => t.type === 'Income').reduce((s,t) => s + t.amount, 0);
        const expense = filtered.filter(t => t.type === 'Expense').reduce((s,t) => s + t.amount, 0);
        const bal = income - expense;

        const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
        const pagedData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

        return (
            <div className="space-y-6 animate-slide-up">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setViewMode('DASHBOARD')} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition shadow-sm text-slate-500"><ArrowLeft/></button>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 leading-tight">{selectedAccount.name}</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Transaction History • {activeTab === 'Budget' ? 'Budget' : 'Non-Budget'}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button onClick={() => setViewMode('PRINT')} className="flex-1 md:flex-none p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition shadow-sm"><Printer size={20}/></button>
                        <button onClick={() => setShowTransForm(true)} className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 border-b-4 border-indigo-800"><Plus size={20}/> บันทึกรายการ</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard label="รายรับสะสม" val={`฿${income.toLocaleString()}`} color="text-emerald-500" icon={<TrendingUp/>}/>
                    <StatCard label="รายจ่ายสะสม" val={`฿${expense.toLocaleString()}`} color="text-rose-500" icon={<TrendingDown/>}/>
                    <StatCard label="คงเหลือสุทธิ" val={`฿${bal.toLocaleString()}`} color="text-indigo-600" icon={<Database/>} isMain/>
                </div>

                <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                    <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
                        <h4 className="font-black text-slate-700 flex items-center gap-2"><List size={20} className="text-indigo-600"/> รายการเคลื่อนไหวล่าสุด</h4>
                        <span className="text-[10px] font-black text-slate-400 uppercase bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">Page {currentPage} of {totalPages || 1}</span>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white text-slate-400 font-black uppercase text-[10px] tracking-widest border-b border-slate-50">
                                <tr><th className="p-6">วันที่</th><th className="p-6">รายละเอียดรายการ</th><th className="p-6 text-right">จำนวนเงิน</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {pagedData.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-6 whitespace-nowrap font-bold text-slate-500">{getThaiDate(t.date)}</td>
                                        <td className="p-6 font-black text-slate-800">{t.description}</td>
                                        <td className={`p-6 text-right font-black text-lg ${t.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {t.type === 'Income' ? '+' : '-'}{t.amount.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                {pagedData.length === 0 && (
                                    <tr><td colSpan={3} className="p-20 text-center text-slate-300 italic font-bold">ไม่พบรายการเคลื่อนไหว</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="p-6 border-t border-slate-50 bg-white flex justify-center items-center gap-3">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 transition disabled:opacity-30"><ChevronLeft size={20}/></button>
                            <span className="font-black text-slate-700 mx-4">{currentPage} / {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 transition disabled:opacity-30"><ChevronRight size={20}/></button>
                        </div>
                    )}
                </div>
            </div>
        )
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-indigo-500 font-prompt">
            <Loader2 className="animate-spin mb-4" size={56}/>
            <p className="font-black text-xl animate-pulse">กำลังโหลดข้อมูลการเงิน...</p>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto font-prompt">
            {viewMode === 'DASHBOARD' && renderDashboard()}
            {viewMode === 'DETAIL' && renderDetail()}

            {/* MODALS */}
            {showImportHelp && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-[45px] shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                        <div className="p-6 bg-emerald-600 text-white flex justify-between items-center">
                            <h3 className="font-black text-xl flex items-center gap-2"><FileSpreadsheet/> คู่มือการนำเข้า Excel</h3>
                            <button onClick={() => setShowImportHelp(false)} className="hover:bg-white/20 p-2 rounded-full transition"><X/></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="bg-emerald-50 p-6 rounded-[30px] border border-emerald-100">
                                <h4 className="font-black text-emerald-800 mb-3 flex items-center gap-2"><Info size={18}/> รูปแบบไฟล์ที่ระบบต้องการ</h4>
                                <ul className="space-y-2 text-sm text-emerald-700 font-bold">
                                    <li className="flex items-center gap-2"><CheckCircle size={14}/> ต้องมีคอลัมน์: วันที่, ชื่อบัญชี, รายการ, ประเภท, จำนวนเงิน</li>
                                    <li className="flex items-center gap-2"><CheckCircle size={14}/> คอลัมน์ 'ประเภท' ระบุ: รายรับ, รายจ่าย (หรือ ฝาก, ถอน)</li>
                                    <li className="flex items-center gap-2"><CheckCircle size={14}/> ระบบจะคัดกรองรายการแยกตามบัญชีให้อัตโนมัติ</li>
                                </ul>
                            </div>
                            <button onClick={handleDownloadTemplate} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-slate-700 transition">
                                <Download size={24}/> ดาวน์โหลดไฟล์ตัวอย่าง (.xlsx)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAccountForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-[45px] shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
                        <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
                            <h3 className="font-black text-lg flex items-center gap-2"><PlusCircle/> เปิดบัญชีใหม่</h3>
                            <button onClick={() => setShowAccountForm(false)} className="hover:bg-white/20 p-2 rounded-full transition"><X/></button>
                        </div>
                        <form onSubmit={handleAddAccount} className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">ชื่อบัญชี</label>
                                <input autoFocus type="text" required value={newAccountForm.name} onChange={e => setNewAccountForm({name: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:bg-white focus:border-indigo-400 transition shadow-inner" placeholder="ระบุชื่อกองทุนหรือรายรับ..."/>
                            </div>
                            <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition border-b-4 border-indigo-900 active:scale-95">ยืนยันการบันทึก</button>
                        </form>
                    </div>
                </div>
            )}

            {showTransForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-[45px] shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
                            <h3 className="font-black text-lg flex items-center gap-2"><PlusCircle/> บันทึกรายการใหม่</h3>
                            <button onClick={() => setShowTransForm(false)} className="hover:bg-white/20 p-2 rounded-full transition"><X/></button>
                        </div>
                        <form onSubmit={handleAddTransaction} className="p-8 space-y-5">
                            <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner">
                                <button type="button" onClick={() => setNewTrans({...newTrans, type: 'Income'})} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${newTrans.type === 'Income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>รายรับ (+)</button>
                                <button type="button" onClick={() => setNewTrans({...newTrans, type: 'Expense'})} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${newTrans.type === 'Expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>รายจ่าย (-)</button>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">วันที่</label><input type="date" required value={newTrans.date} onChange={e => setNewTrans({...newTrans, date: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none"/></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">รายการ</label><input type="text" required value={newTrans.desc} onChange={e => setNewTrans({...newTrans, desc: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none" placeholder="ระบุรายละเอียด..."/></div>
                                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">จำนวนเงิน</label><input type="number" step="0.01" required value={newTrans.amount} onChange={e => setNewTrans({...newTrans, amount: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xl text-center outline-none text-slate-800" placeholder="0.00"/></div>
                            </div>
                            <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[25px] font-black text-xl shadow-xl hover:bg-indigo-700 transition border-b-8 border-indigo-900 active:scale-95">บันทึกข้อมูล</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard: React.FC<{ label: string, val: string, color: string, icon: React.ReactNode, isMain?: boolean }> = ({ label, val, color, icon, isMain }) => (
    <div className={`p-6 rounded-[35px] border-2 transition-all shadow-sm flex items-center gap-5 ${isMain ? 'bg-slate-800 text-white border-slate-900' : 'bg-white border-slate-50'}`}>
        <div className={`p-4 rounded-2xl shadow-inner ${isMain ? 'bg-indigo-600 text-white' : 'bg-slate-50 ' + color.replace('text-', 'text-')}`}>{icon}</div>
        <div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${isMain ? 'text-slate-400' : 'text-slate-400'}`}>{label}</p>
            <p className={`text-2xl font-black tracking-tight ${isMain ? 'text-white' : color}`}>{val}</p>
        </div>
    </div>
);

export default FinanceManager;