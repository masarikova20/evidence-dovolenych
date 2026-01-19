import React, { useState, useEffect } from 'react';
import { Calendar, Plus, History, Users, Trash2, Lock, Edit2, X, Save, ChevronLeft, ChevronRight, List, Download, CheckCircle, XCircle } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';

// Firebase konfigurace
const firebaseConfig = {
  apiKey: "AIzaSyBdJaRu4hS5-SdK2WidwtSzY8XuuJjidP0",
  authDomain: "evidence-dovolena.firebaseapp.com",
  projectId: "evidence-dovolena",
  storageBucket: "evidence-dovolena.firebasestorage.app",
  messagingSenderId: "160354356746",
  appId: "1:160354356746:web:c67b34827998a70afb19f3",
  measurementId: "G-X6ZLBF9M6J"
};

// Inicializace Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// České státní svátky
const czechHolidays = {
  2024: {
    '2024-01-01': 'Nový rok',
    '2024-04-01': 'Velikonoční pondělí',
    '2024-05-01': 'Svátek práce',
    '2024-05-08': 'Den vítězství',
    '2024-07-05': 'Den Cyrila a Metoděje',
    '2024-07-06': 'Den Jana Husa',
    '2024-09-28': 'Den české státnosti',
    '2024-10-28': 'Den vzniku ČSR',
    '2024-11-17': 'Den boje za svobodu',
    '2024-12-24': 'Štědrý den',
    '2024-12-25': '1. svátek vánoční',
    '2024-12-26': '2. svátek vánoční'
  },
  2025: {
    '2025-01-01': 'Nový rok',
    '2025-04-21': 'Velikonoční pondělí',
    '2025-05-01': 'Svátek práce',
    '2025-05-08': 'Den vítězství',
    '2025-07-05': 'Den Cyrila a Metoděje',
    '2025-07-06': 'Den Jana Husa',
    '2025-09-28': 'Den české státnosti',
    '2025-10-28': 'Den vzniku ČSR',
    '2025-11-17': 'Den boje za svobodu',
    '2025-12-24': 'Štědrý den',
    '2025-12-25': '1. svátek vánoční',
    '2025-12-26': '2. svátek vánoční'
  },
  2026: {
    '2026-01-01': 'Nový rok',
    '2026-04-06': 'Velikonoční pondělí',
    '2026-05-01': 'Svátek práce',
    '2026-05-08': 'Den vítězství',
    '2026-07-05': 'Den Cyrila a Metoděje',
    '2026-07-06': 'Den Jana Husa',
    '2026-09-28': 'Den české státnosti',
    '2026-10-28': 'Den vzniku ČSR',
    '2026-11-17': 'Den boje za svobodu',
    '2026-12-24': 'Štědrý den',
    '2026-12-25': '1. svátek vánoční',
    '2026-12-26': '2. svátek vánoční'
  }
};

const getHolidayName = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  return czechHolidays[year]?.[dateStr] || null;
};

const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const isHoliday = (date) => {
  return getHolidayName(date) !== null;
};

// Výpočet pracovních dnů (bez víkendů a svátků)
// Pro půldenní dovolené vrací 0.5 dne (4 hodiny)
const calculateWorkingDays = (startDate, endDate, vacationType) => {
  // Pro půldenní dovolené vrátíme 0.5 dne (4 hodiny)
  if (vacationType === 'dopoledne' || vacationType === 'odpoledne') {
    return 0.5;
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  let workingDays = 0;
  
  const currentDate = new Date(start);
  while (currentDate <= end) {
    if (!isWeekend(currentDate) && !isHoliday(currentDate)) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
};

const VacationTracker = () => {
  const [vacations, setVacations] = useState([]);
  const [currentUser, setCurrentUser] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [notification, setNotification] = useState(null);
  const [showNewEmployeeInput, setShowNewEmployeeInput] = useState(false);
  
  const [formData, setFormData] = useState({
    employee: '',
    startDate: '',
    endDate: '',
    type: 'dovolena'
  });

  const [editData, setEditData] = useState({
    startDate: '',
    endDate: '',
    type: 'dovolena'
  });

  useEffect(() => {
    loadCurrentUser();
    
    const unsubscribe = onSnapshot(collection(db, 'vacations'), (snapshot) => {
      const vacationData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVacations(vacationData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadCurrentUser = () => {
    const saved = localStorage.getItem('currentUserName');
    if (saved) {
      setCurrentUser(saved);
      setFormData(prev => ({ ...prev, employee: saved }));
    }
  };

  const saveCurrentUser = (name) => {
    localStorage.setItem('currentUserName', name);
    setCurrentUser(name);
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAdminLogin = () => {
    if (adminPassword === 'DovoleneAI123') {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPassword('');
      showNotification('Přihlášen jako admin', 'success');
    } else {
      showNotification('Nesprávné heslo', 'error');
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    showNotification('Odhlášen z admin režimu', 'success');
  };

  const checkOverlap = (newStart, newEnd, employeeName, excludeId = null) => {
    const start = new Date(newStart);
    const end = new Date(newEnd);
    
    return vacations.some(vacation => {
      if (excludeId && vacation.id === excludeId) return false;
      if (vacation.employee.toLowerCase() !== employeeName.toLowerCase()) return false;
      
      const vStart = new Date(vacation.startDate);
      const vEnd = new Date(vacation.endDate);
      
      return (start <= vEnd && end >= vStart);
    });
  };

  const exportToExcel = () => {
    const allVacations = [...vacations].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    
    let csv = '\uFEFF';
    csv += 'Jméno,Typ volna,Od,Do,Počet pracovních dní,Stav\n';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    allVacations.forEach(v => {
      const endDate = new Date(v.endDate);
      const status = endDate >= today ? 'Aktuální/Plánované' : 'Historie';
      
      csv += `"${v.employee}","${getTypeLabel(v.type)}","${formatDate(v.startDate)}","${formatDate(v.endDate)}","${v.days}","${status}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `dovolene_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Data byla exportována', 'success');
  };

  // Získání unikátních zaměstnanců pro admin dropdown
  const uniqueEmployees = [...new Set(vacations.map(v => v.employee))].sort();

  const addVacation = async () => {
    if (!formData.employee || !formData.startDate || !formData.endDate) {
      showNotification('Vyplň prosím všechna povinná pole', 'error');
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    
    if (end < start) {
      showNotification('Konec dovolené nemůže být před začátkem', 'error');
      return;
    }

    if (checkOverlap(formData.startDate, formData.endDate, formData.employee)) {
      showNotification('Pro tento termín již má tento zaměstnanec zadanou nedostupnost. Proveď editaci v záložce Seznam.', 'error');
      return;
    }

    // Uložit jméno pokud není admin (admin neukládá své jméno)
    if (!isAdmin) {
      saveCurrentUser(formData.employee);
    }

    const workingDays = calculateWorkingDays(formData.startDate, formData.endDate, formData.type);

    const newVacation = {
      employee: formData.employee,
      startDate: formData.startDate,
      endDate: formData.endDate,
      type: formData.type,
      createdAt: new Date().toISOString(),
      days: workingDays
    };

    try {
      await addDoc(collection(db, 'vacations'), newVacation);
      // Reset formuláře - v admin režimu vynulujeme i zaměstnance
      setFormData({ 
        employee: isAdmin ? '' : formData.employee, 
        startDate: '', 
        endDate: '', 
        type: 'dovolena' 
      });
      setShowNewEmployeeInput(false); // Reset admin inputu
      showNotification('Záznam byl úspěšně zaznamenán. Editovat ho můžeš v záložce Seznam.', 'success');
    } catch (error) {
      showNotification('Chyba při ukládání dat', 'error');
    }
  };

  const startEdit = (vacation) => {
    setEditingId(vacation.id);
    setEditData({
      startDate: vacation.startDate,
      endDate: vacation.endDate,
      type: vacation.type
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({ startDate: '', endDate: '', type: 'dovolena' });
  };

  const saveEdit = async (vacationId, employeeName) => {
    if (!editData.startDate || !editData.endDate) {
      showNotification('Vyplň všechna pole', 'error');
      return;
    }

    const start = new Date(editData.startDate);
    const end = new Date(editData.endDate);
    
    if (end < start) {
      showNotification('Konec dovolené nemůže být před začátkem', 'error');
      return;
    }

    if (checkOverlap(editData.startDate, editData.endDate, employeeName, vacationId)) {
      showNotification('Pro tento termín již má tento zaměstnanec zadanou nedostupnost.', 'error');
      return;
    }

    const workingDays = calculateWorkingDays(editData.startDate, editData.endDate, editData.type);

    try {
      await updateDoc(doc(db, 'vacations', vacationId), {
        startDate: editData.startDate,
        endDate: editData.endDate,
        type: editData.type,
        days: workingDays
      });
      setEditingId(null);
      showNotification('Záznam byl upraven', 'success');
    } catch (error) {
      showNotification('Chyba při úpravě', 'error');
    }
  };

  const deleteVacation = async (id) => {
    if (confirm('Opravdu smazat tento záznam?')) {
      try {
        await deleteDoc(doc(db, 'vacations', id));
        showNotification('Záznam byl smazán', 'success');
      } catch (error) {
        showNotification('Chyba při mazání', 'error');
      }
    }
  };

  const canEditVacation = (vacation) => {
    if (isAdmin) return true;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(vacation.endDate);
    
    // Načti jméno z localStorage, pokud currentUser je prázdný
    const userName = currentUser || localStorage.getItem('currentUserName') || '';
    
    return userName && vacation.employee.toLowerCase() === userName.toLowerCase() && endDate >= today;
  };

  const getCurrentAndFutureVacations = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return vacations.filter(v => {
      const end = new Date(v.endDate);
      return end >= today;
    }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  };

  const getHistoricalVacations = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return vacations.filter(v => {
      const end = new Date(v.endDate);
      return end < today;
    }).sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
  };

  const getTotalDaysByEmployee = () => {
    const byEmployee = {};
    
    getHistoricalVacations().forEach(vacation => {
      if (!byEmployee[vacation.employee]) {
        byEmployee[vacation.employee] = 0;
      }
      byEmployee[vacation.employee] += vacation.days;
    });
    
    return Object.entries(byEmployee).sort((a, b) => b[1] - a[1]);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getTypeLabel = (type) => {
    const types = {
      dovolena: 'Dovolená/Nedostupnost',
      dopoledne: 'Dovolená - dopoledne',
      odpoledne: 'Dovolená - odpoledne',
      skoleni: 'Školení',
      workshop: 'Holdingový workshop',
      potencialni: 'Potencionální dovolená'
    };
    return types[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      dovolena: 'bg-blue-500 text-white',
      dopoledne: 'bg-pink-300 text-gray-800',
      odpoledne: 'bg-green-300 text-gray-800',
      skoleni: 'bg-purple-500 text-white',
      workshop: 'bg-orange-500 text-white',
      potencialni: 'bg-yellow-400 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getTypeBorderColor = (type) => {
    const colors = {
      dovolena: 'border-blue-600',
      dopoledne: 'border-pink-400',
      odpoledne: 'border-green-400',
      skoleni: 'border-purple-600',
      workshop: 'border-orange-600',
      potencialni: 'border-yellow-500'
    };
    return colors[type] || 'border-gray-200';
  };

  const isOnVacation = (vacation) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(vacation.startDate);
    const end = new Date(vacation.endDate);
    return start <= today && end >= today;
  };

  const isInRange = (vacation, date) => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const start = new Date(vacation.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(vacation.endDate);
    end.setHours(0, 0, 0, 0);
    
    return checkDate >= start && checkDate <= end;
  };

  const changeDate = (direction) => {
    const newDate = new Date(currentDate);
    
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    
    setCurrentDate(newDate);
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDays.push(date);
    }

    const currentVacations = getCurrentAndFutureVacations();

    return (
      <div>
        <div className="text-center py-3 bg-blue-50 rounded-lg mb-4">
          <h3 className="text-xl font-bold text-gray-800">
            {weekDays[0].toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })} - {weekDays[6].toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' })}
          </h3>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((date, idx) => {
            const dayVacations = currentVacations.filter(v => isInRange(v, date));
            const isToday = date.toDateString() === new Date().toDateString();
            const isWeekendDay = isWeekend(date);
            const holidayName = getHolidayName(date);

            return (
              <div key={idx} className={`min-h-32 border rounded-lg p-2 ${isToday ? 'border-blue-500 border-2 bg-blue-50' : (isWeekendDay || holidayName) ? 'bg-gray-50' : 'bg-white'}`}>
                <div className="text-center mb-2">
                  <div className="text-xs font-medium text-gray-600">
                    {date.toLocaleDateString('cs-CZ', { weekday: 'short' })}
                  </div>
                  <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>
                    {date.getDate()}
                  </div>
                  {holidayName && (
                    <div className="text-xs text-gray-500 mt-1 font-medium">
                      {holidayName}
                    </div>
                  )}
                </div>
                
                <div className="space-y-1">
                  {dayVacations.map(vacation => (
                    <div key={vacation.id} className={`text-xs p-1 rounded border-l-2 ${getTypeColor(vacation.type)} ${getTypeBorderColor(vacation.type)}`}>
                      <div className="font-medium truncate">{vacation.employee.split(' ')[0]}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    startDate.setDate(firstDay.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    
    const weeks = [];
    let currentWeek = [];
    let date = new Date(startDate);
    
    while (date <= lastDay || currentWeek.length < 7) {
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(new Date(date));
      date.setDate(date.getDate() + 1);
      
      if (weeks.length >= 6) break;
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);

    const currentVacations = getCurrentAndFutureVacations();

    return (
      <div>
        <div className="text-center py-3 bg-blue-50 rounded-lg mb-4">
          <h3 className="text-2xl font-bold text-gray-800">
            {currentDate.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}
          </h3>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map(day => (
            <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 gap-1 mb-1">
            {week.map((date, dayIdx) => {
              const dayVacations = currentVacations.filter(v => isInRange(v, date));
              const isToday = date.toDateString() === new Date().toDateString();
              const isCurrentMonth = date.getMonth() === month;
              const isWeekendDay = isWeekend(date);
              const holidayName = getHolidayName(date);

              return (
                <div 
                  key={dayIdx} 
                  className={`min-h-24 border rounded p-1 ${
                    isToday ? 'border-blue-500 border-2 bg-blue-50' : 
                    !isCurrentMonth ? 'bg-gray-100 text-gray-400' :
                    (isWeekendDay || holidayName) ? 'bg-gray-50' : 'bg-white'
                  }`}
                >
                  <div className={`text-xs font-bold mb-1 ${isToday ? 'text-blue-600' : isCurrentMonth ? 'text-gray-800' : 'text-gray-400'}`}>
                    {date.getDate()}
                  </div>
                  
                  {holidayName && (
                    <div className="text-xs text-gray-500 mb-1 font-medium leading-tight">
                      {holidayName}
                    </div>
                  )}
                  
                  <div className="space-y-0.5">
                    {dayVacations.slice(0, 2).map(vacation => (
                      <div key={vacation.id} className={`text-xs px-1 rounded border-l-2 ${getTypeColor(vacation.type)} ${getTypeBorderColor(vacation.type)} truncate`}>
                        {vacation.employee.split(' ')[0]}
                      </div>
                    ))}
                    {dayVacations.length > 2 && (
                      <div className="text-xs text-gray-500 px-1">+{dayVacations.length - 2}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center">
        <div className="text-xl text-gray-600">Načítám data...</div>
      </div>
    );
  }

  const currentAndFutureVacations = getCurrentAndFutureVacations();
  const historicalVacations = getHistoricalVacations();
  const employeeStats = getTotalDaysByEmployee();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      {notification && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 md:p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Evidence dovolených</h1>
                <p className="text-blue-100">Týmový přehled volna</p>
                {currentUser && !isAdmin && (
                  <p className="text-sm mt-2 bg-white/20 inline-block px-3 py-1 rounded-full">
                    Přihlášen: {currentUser}
                  </p>
                )}
                {isAdmin && (
                  <p className="text-sm mt-2 bg-yellow-400 text-gray-900 inline-block px-3 py-1 rounded-full font-semibold">
                    🔑 Admin režim
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <Calendar className="w-12 h-12 md:w-16 md:h-16 opacity-80" />
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Plus className="w-6 h-6 text-blue-600" />
                  Zadat novou dovolenou
                </h2>
                {!isAdmin ? (
                  <button
                    onClick={() => setShowAdminLogin(!showAdminLogin)}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <Lock className="w-4 h-4" />
                    Admin přístup
                  </button>
                ) : (
                  <button
                    onClick={handleAdminLogout}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Lock className="w-4 h-4" />
                    Odhlásit admin
                  </button>
                )}
              </div>

              {showAdminLogin && (
                <div className="mb-4 p-4 bg-white rounded-lg border border-gray-300">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Administrátorské heslo
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Zadejte heslo"
                    />
                    <button
                      onClick={handleAdminLogin}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Přihlásit
                    </button>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isAdmin ? 'Zaměstnanec *' : 'Tvoje jméno *'}
                  </label>
                  {isAdmin ? (
                    <>
                      {!showNewEmployeeInput ? (
                        <select
                          value={formData.employee}
                          onChange={(e) => {
                            if (e.target.value === '__new__') {
                              setShowNewEmployeeInput(true);
                              setFormData({...formData, employee: ''});
                            } else {
                              setFormData({...formData, employee: e.target.value});
                            }
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                          <option value="">-- Vyber zaměstnance --</option>
                          {uniqueEmployees.map(emp => (
                            <option key={emp} value={emp}>{emp}</option>
                          ))}
                          <option value="__new__">➕ Zadat nové jméno ručně</option>
                        </select>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={formData.employee}
                            onChange={(e) => setFormData({...formData, employee: e.target.value})}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Zadej jméno nového zaměstnance"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setShowNewEmployeeInput(false);
                              setFormData({...formData, employee: ''});
                            }}
                            className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            title="Zpět na výběr ze seznamu"
                          >
                            ↩️
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <input
                      type="text"
                      value={formData.employee}
                      onChange={(e) => setFormData({...formData, employee: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Např. Jana Nováková"
                    />
                  )}
                  {!isAdmin && (
                    <p className="text-xs text-gray-500 mt-1">Zadej své jméno stejně pokaždé - budeš moci editovat jen své dovolené</p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Začátek *
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Konec *
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Typ volna
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="dovolena">Dovolená/Nedostupnost</option>
                    <option value="dopoledne">Dovolená - dopoledne (0.5 dne = 4h)</option>
                    <option value="odpoledne">Dovolená - odpoledne (0.5 dne = 4h)</option>
                    <option value="skoleni">Školení</option>
                    <option value="workshop">Holdingový workshop</option>
                    <option value="potencialni">Potencionální dovolená</option>
                  </select>
                </div>

                <button
                  onClick={addVacation}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg"
                >
                  Odeslat žádost
                </button>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Users className="w-7 h-7 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-800">Aktuální a plánované dovolené</h2>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setViewMode('week');
                      setCurrentDate(new Date());
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      viewMode === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Týden
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('month');
                      setCurrentDate(new Date());
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      viewMode === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Měsíc
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <List className="w-4 h-4" />
                    Seznam
                  </button>
                </div>
              </div>

              {(viewMode === 'week' || viewMode === 'month') && (
                <div className="flex items-center justify-between mb-4 bg-gray-50 p-3 rounded-lg">
                  <button
                    onClick={() => changeDate(-1)}
                    className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-4 py-2 bg-white rounded-lg hover:bg-gray-100 transition-colors font-medium text-gray-700"
                  >
                    Dnes
                  </button>
                  <button
                    onClick={() => changeDate(1)}
                    className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-700" />
                  </button>
                </div>
              )}

              {(viewMode === 'week' || viewMode === 'month') && (
                <div className="flex flex-wrap gap-3 mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Dovolená</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-pink-300 rounded"></div>
                    <span>Dopoledne (0.5 dne)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-300 rounded"></div>
                    <span>Odpoledne (0.5 dne)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded"></div>
                    <span>Školení</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded"></div>
                    <span>Workshop</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-400 rounded"></div>
                    <span>Potencionální</span>
                  </div>
                </div>
              )}

              {viewMode === 'list' && (
                currentAndFutureVacations.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-xl">
                    <Calendar className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg text-gray-500">Žádné aktuální nebo plánované dovolené</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {currentAndFutureVacations.map(vacation => (
                      <div
                        key={vacation.id}
                        className={`p-5 rounded-xl border-2 transition-all ${
                          isOnVacation(vacation)
                            ? 'bg-yellow-50 border-yellow-400 shadow-md'
                            : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
                        }`}
                      >
                        {editingId === vacation.id ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-xl font-bold text-gray-800">
                                {vacation.employee}
                              </h3>
                              <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                                Režim úpravy
                              </span>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Začátek
                                </label>
                                <input
                                  type="date"
                                  value={editData.startDate}
                                  onChange={(e) => setEditData({...editData, startDate: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Konec
                                </label>
                                <input
                                  type="date"
                                  value={editData.endDate}
                                  onChange={(e) => setEditData({...editData, endDate: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Typ volna
                              </label>
                              <select
                                value={editData.type}
                                onChange={(e) => setEditData({...editData, type: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                              >
                                <option value="dovolena">Dovolená/Nedostupnost</option>
                                <option value="dopoledne">Dovolená - dopoledne (0.5 dne)</option>
                                <option value="odpoledne">Dovolená - odpoledne (0.5 dne)</option>
                                <option value="skoleni">Školení</option>
                                <option value="workshop">Holdingový workshop</option>
                                <option value="potencialni">Potencionální dovolená</option>
                              </select>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => saveEdit(vacation.id, vacation.employee)}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                              >
                                <Save className="w-4 h-4" />
                                Uložit změny
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                              >
                                <X className="w-4 h-4" />
                                Zrušit
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <h3 className="text-xl font-bold text-gray-800">
                                  {vacation.employee}
                                </h3>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(vacation.type)}`}>
                                  {getTypeLabel(vacation.type)}
                                </span>
                                {isOnVacation(vacation) && (
                                  <span className="px-3 py-1 rounded-full text-sm font-bold bg-yellow-300 text-yellow-900 animate-pulse">
                                    ● Právě volno
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-6 text-gray-700">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                  <span className="font-medium">{formatDate(vacation.startDate)} - {formatDate(vacation.endDate)}</span>
                                </div>
                                <div className="font-semibold text-blue-600">
                                  {vacation.days} {vacation.days === 1 ? 'pracovní den' : vacation.days === 0.5 ? 'pracovního dne (4h)' : vacation.days < 5 ? 'pracovní dny' : 'pracovních dní'}
                                </div>
                              </div>
                            </div>
                            {canEditVacation(vacation) && (
                              <div className="flex gap-2 ml-4">
                                <button
                                  onClick={() => startEdit(vacation)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Upravit"
                                >
                                  <Edit2 className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => deleteVacation(vacation.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Smazat"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}

              {viewMode === 'week' && renderWeekView()}
              {viewMode === 'month' && renderMonthView()}
            </div>

            {isAdmin && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <History className="w-7 h-7 text-gray-600" />
                    <h2 className="text-2xl font-bold text-gray-800">Historie a statistiky</h2>
                    <span className="ml-2 px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-medium">
                      Pouze admin
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        if (!confirm('Tato akce opraví:\n\n1. Sloučí duplicitní jména:\n   - "Dominik" → "Dominik Mathauser"\n\n2. Odstraní neviditelné znaky a extra mezery ze všech jmen\n\n3. Přepočítá všechny půldenní dovolené z 1 dne na 0.5 dne\n\nPokračovat?')) {
                          return;
                        }

                        try {
                          let fixed = 0;
                          
                          // Pravidla pro sloučení jmen
                          const nameMapping = {
                            'Dominik': 'Dominik Mathauser'
                          };

                          for (const vacation of vacations) {
                            let needsUpdate = false;
                            let newData = {};

                            // 1. Normalizace jména (odstranění extra mezer a neviditelných znaků)
                            let normalizedName = vacation.employee.trim().replace(/\s+/g, ' ');
                            
                            // 2. Aplikace mapování
                            if (nameMapping[normalizedName]) {
                              normalizedName = nameMapping[normalizedName];
                            }
                            
                            if (normalizedName !== vacation.employee) {
                              newData.employee = normalizedName;
                              needsUpdate = true;
                            }

                            // 3. Oprava půldenních dovolených
                            if ((vacation.type === 'dopoledne' || vacation.type === 'odpoledne') && vacation.days !== 0.5) {
                              newData.days = 0.5;
                              needsUpdate = true;
                            }

                            // Aktualizuj záznam, pokud je potřeba
                            if (needsUpdate) {
                              await updateDoc(doc(db, 'vacations', vacation.id), newData);
                              fixed++;
                            }
                          }

                          showNotification(`Opraveno ${fixed} záznamů!`, 'success');
                        } catch (error) {
                          showNotification('Chyba při opravě dat', 'error');
                          console.error(error);
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                      title="Opraví duplicitní jména a přepočítá půldenní dovolené"
                    >
                      🔧 Opravit data
                    </button>
                    <button
                      onClick={exportToExcel}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      <Download className="w-5 h-5" />
                      Stáhnout data (Excel)
                    </button>
                  </div>
                </div>

                {employeeStats.length > 0 && (
                  <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Čerpání dovolené (minulé záznamy)</h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {employeeStats.map(([name, days]) => (
                        <div key={name} className="bg-white rounded-lg p-4 shadow">
                          <div className="font-semibold text-gray-800">{name}</div>
                          <div className="text-2xl font-bold text-purple-600">
                            {days} {days === 1 ? 'pracovní den' : days === 0.5 ? 'pracovního dne' : days < 5 ? 'pracovní dny' : 'pracovních dní'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {historicalVacations.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-xl">
                    <History className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg text-gray-500">Zatím žádná historie</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {historicalVacations.map(vacation => (
                      <div
                        key={vacation.id}
                        className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-700">
                              {vacation.employee}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(vacation.type)}`}>
                              {getTypeLabel(vacation.type)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <span>{formatDate(vacation.startDate)} - {formatDate(vacation.endDate)}</span>
                            <span className="font-medium">
                              {vacation.days} {vacation.days === 1 ? 'pracovní den' : vacation.days === 0.5 ? 'pracovního dne (4h)' : vacation.days < 5 ? 'pracovní dny' : 'pracovních dní'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteVacation(vacation.id)}
                          className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Smazat"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 bg-blue-50 rounded-lg p-4 text-sm text-blue-900">
          <p className="font-semibold mb-2">ℹ️ Jak systém funguje:</p>
          <ul className="space-y-1 ml-4">
            <li>• <strong>Všichni</strong> vidí aktuální a plánované dovolené</li>
            <li>• <strong>Všichni</strong> mohou zadávat nové dovolené pomocí formuláře</li>
            <li>• <strong>Admin může přidávat</strong> dovolené za kohokoliv z týmu</li>
            <li>• <strong>Můžeš editovat/rušit</strong> pouze své dovolené (dokud neuplynou)</li>
            <li>• <strong>Kontrola překryvů:</strong> Systém nedovolí zadat duplicitní záznamy</li>
            <li>• <strong>Přepínej zobrazení:</strong> Týden / Měsíc / Seznam</li>
            <li>• <strong>Pouze admin</strong> vidí statistiky čerpání, historii a může exportovat data</li>
            <li>• <strong>Svátky a víkendy</strong> jsou zvýrazněny šedou barvou v kalendáři</li>
            <li>• <strong>Počet dní:</strong> Počítají se pouze pracovní dny (bez víkendů a svátků)</li>
            <li>• <strong>Půldenní dovolená:</strong> Dopoledne/Odpoledne = 0.5 dne (4 hodiny)</li>
            <li>• Zadávej své jméno vždy stejně, aby ti systém poznal tvoje dovolené</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

function App() {
  return <VacationTracker />;
}

export default App;
