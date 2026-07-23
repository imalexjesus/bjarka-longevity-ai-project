import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Heart, 
  BookOpen, 
  ShoppingBag, 
  Settings, 
  Sparkles, 
  Plus, 
  Sun, 
  Moon, 
  AlertTriangle, 
  Database,
  FileText,
  Scissors,
  CheckCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  TrendingDown
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDark, setIsDark] = useState(true);
  const [profile, setProfile] = useState({
    name_en: "Bjarki",
    name_ru: "Бьярки",
    breed: "Самоед",
    age: "10 лет 8 месяцев",
    weight_current: 31.0,
    weight_target: 25.0,
    target_activity: 45,
    diet: "Farmina N&D Pumpkin Lamb",
    conditions: []
  });
  
  const [logs, setLogs] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [settings, setSettings] = useState({
    gemini_api_key: '',
    ollama_url: 'http://localhost:11434'
  });

  // Form states
  const [logWeight, setLogWeight] = useState('');
  const [logActivity, setLogActivity] = useState('');
  const [logSymptoms, setLogSymptoms] = useState('');
  
  const [manualDate, setManualDate] = useState('');
  const [manualCategory, setManualCategory] = useState('корм');
  const [manualItem, setManualItem] = useState('');

  // Settings form states
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [ollamaUrlInput, setOllamaUrlInput] = useState('');
  const [targetWeightInput, setTargetWeightInput] = useState('');
  const [targetActivityInput, setTargetActivityInput] = useState('');
  const [dietInput, setDietInput] = useState('');

  // AI analyzers state
  const [nutritionIngredients, setNutritionIngredients] = useState('');
  const [nutritionAnalysis, setNutritionAnalysis] = useState('');
  const [nutritionLoading, setNutritionLoading] = useState(false);

  const [priceFile, setPriceFile] = useState(null);
  const [priceCategories, setPriceCategories] = useState('');
  const [priceAnalysis, setPriceAnalysis] = useState('');
  const [priceLoading, setPriceLoading] = useState(false);

  // Recommendations state
  const [aiReport, setAiReport] = useState({
    health_analysis: "",
    risk_assessment: "",
    recommendations: []
  });
  const [recsLoading, setRecsLoading] = useState(false);

  // Grooming section state
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedTool, setSelectedTool] = useState('slicker');

  // Knowledge Base State
  const [knowledgeTree, setKnowledgeTree] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeArticle, setActiveArticle] = useState(null);
  const [articleLoading, setArticleLoading] = useState(false);

  const zoneArticleMap = {
    1: { path: "grooming/samoyed-cosmetics-guide.md", title: "Мануал: Схема мытья и ухода за мордой", label: "🧼 Схема мытья и косметики" },
    2: { path: "grooming/ollipet-dryer-guide.md", title: "Руководство: Выдув воротника компрессором", label: "💨 Выдув компрессором" },
    3: { path: "health/ustyuki-guide.md", title: "Предостережение: Осмотр груди на устюки", label: "⚠️ Гайд по Устюкам" },
    4: { path: "grooming/samoyed-cosmetics-guide.md", title: "Руководство: Уход за остью на спине", label: "🧼 Текстурирование ости" },
    5: { path: "grooming/scissors-guide.md", title: "Схема: Окантовка лап «Кошачья лапка»", label: "✂️ Стрижка «Кошачья лапка»" },
    6: { path: "health/ustyuki-guide.md", title: "Защита живота и паха от устюков", label: "⚠️ Гайд по Устюкам" },
    7: { path: "grooming/scissors-guide.md", title: "Схема: Формирование округлых штанов", label: "✂️ Ножницы для «Штанов»" },
    8: { path: "grooming/samoyed-cosmetics-guide.md", title: "Руководство: Кондиционирование хвоста", label: "🪮 Уход за хвостом" }
  };

  useEffect(() => {
    fetch('/api/knowledge/tree')
      .then(res => res.json())
      .then(data => setKnowledgeTree(data))
      .catch(err => console.error("Error fetching knowledge tree:", err));
  }, []);

  const openArticle = async (path, title = "") => {
    setArticleLoading(true);
    try {
      const res = await fetch(`/api/knowledge/article?path=${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error("Не удалось загрузить статью");
      const data = await res.json();
      setActiveArticle({
        title: title || data.path.split('/').pop().replace('.md', ''),
        path: data.path,
        content: data.content,
        word_count: data.word_count,
        read_time_min: data.read_time_min
      });
    } catch (e) {
      alert("Ошибка при открытии статьи: " + e.message);
    } finally {
      setArticleLoading(false);
    }
  };

  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Load theme on startup
  useEffect(() => {
    const savedTheme = localStorage.getItem('bjarki_theme');
    if (savedTheme === 'light') {
      setIsDark(false);
      document.body.classList.add('light-theme');
    } else {
      setIsDark(true);
      document.body.classList.remove('light-theme');
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.body.classList.add('light-theme');
      localStorage.setItem('bjarki_theme', 'light');
    } else {
      document.body.classList.remove('light-theme');
      localStorage.setItem('bjarki_theme', 'dark');
    }
    setIsDark(!isDark);
  };

  // Fetch initial data
  const fetchData = async () => {
    try {
      const [profileRes, logsRes, purchasesRes, settingsRes] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/logs'),
        fetch('/api/purchases'),
        fetch('/api/settings')
      ]);

      if (profileRes.ok) {
        const pData = await profileRes.json();
        setProfile(pData);
        setTargetWeightInput(pData.weight_target || pData.target_weight || '');
        setTargetActivityInput(pData.target_activity || '');
        setDietInput(pData.diet || '');
      }
      if (logsRes.ok) setLogs(await logsRes.json());
      if (purchasesRes.ok) setPurchases(await purchasesRes.json());
      
      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        setSettings(sData);
        setGeminiKeyInput(sData.gemini_api_key || '');
        setOllamaUrlInput(sData.ollama_url || 'http://localhost:11434');
      }
    } catch (e) {
      console.error("Error loading server data, using fallbacks:", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch recommendations whenever logs or profile changes
  useEffect(() => {
    const fetchRecs = async () => {
      setRecsLoading(true);
      try {
        const res = await fetch('/api/recommendations');
        if (res.ok) {
          setAiReport(await res.json());
        }
      } catch (e) {
        console.error("Failed to load AI recommendations:", e);
      } finally {
        setRecsLoading(false);
      }
    };
    if (logs.length > 0) {
      fetchRecs();
    }
  }, [logs, profile]);

  // Render weight chart
  useEffect(() => {
    if (logs.length === 0 || !chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    const labels = logs.map(l => l.date);
    const weights = logs.map(l => l.weight);

    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Вес (кг)',
          data: weights,
          borderColor: '#0ea5e9',
          backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : 'rgba(14, 165, 233, 0.05)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { 
            grid: { color: gridColor }, 
            ticks: { color: textColor } 
          },
          x: { 
            grid: { display: false }, 
            ticks: { color: textColor } 
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [logs, isDark, activeTab]);

  // Calculations
  const latestLog = logs.length > 0 ? logs[logs.length - 1] : null;
  
  const calculateLocalHealthScore = () => {
    if (!latestLog) return 100;
    let score = 100;
    const targetW = profile.weight_target || 25.0;
    if (latestLog.weight) {
      const diff = Math.abs(latestLog.weight - targetW);
      score -= Math.min(diff * 8, 30);
    }
    if (latestLog.activity_minutes !== undefined) {
      const targetAct = profile.target_activity || 45;
      if (latestLog.activity_minutes < targetAct) {
        const deficit = targetAct - latestLog.activity_minutes;
        score -= Math.min((deficit / targetAct) * 30, 30);
      }
    }
    if (latestLog.symptoms && latestLog.symptoms.length > 0) {
      score -= Math.min(latestLog.symptoms.length * 15, 40);
    }
    return Math.max(Math.round(score), 0);
  };

  const healthScore = calculateLocalHealthScore();

  // Handlers
  const handleAddLog = async (e) => {
    e.preventDefault();
    const weight = parseFloat(logWeight);
    const activity = parseInt(logActivity);
    if (isNaN(weight) || isNaN(activity)) return;

    const newLog = {
      date: new Date().toISOString().split('T')[0],
      weight,
      activity_minutes: activity,
      symptoms: logSymptoms
    };

    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLog)
      });
      if (res.ok) {
        fetchData();
        setLogWeight('');
        setLogActivity('');
        setLogSymptoms('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPurchase = async (e) => {
    e.preventDefault();
    if (!manualDate || !manualItem) return;

    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: manualDate,
          category: manualCategory,
          item: manualItem
        })
      });
      if (res.ok) {
        fetchData();
        setManualDate('');
        setManualItem('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { key: 'gemini_api_key', value: geminiKeyInput },
          { key: 'ollama_url', value: ollamaUrlInput }
        ])
      });
      if (res.ok) {
        alert("Настройки сохранены!");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const updated = {
      ...profile,
      weight_target: parseFloat(targetWeightInput),
      target_activity: parseInt(targetActivityInput),
      diet: dietInput
    };
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        alert("Профиль Бьярки успешно обновлен!");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnalyzeNutrition = async (e) => {
    e.preventDefault();
    if (!nutritionIngredients) return;
    setNutritionLoading(true);
    setNutritionAnalysis('');
    
    const formData = new FormData();
    formData.append('ingredients', nutritionIngredients);

    try {
      const res = await fetch('/api/analyze-nutrition', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setNutritionAnalysis(data.analysis);
      }
    } catch (err) {
      setNutritionAnalysis("Ошибка загрузки анализа: " + err.message);
    } finally {
      setNutritionLoading(false);
    }
  };

  const handleAnalyzePrice = async (e) => {
    e.preventDefault();
    if (!priceFile || !priceCategories) return;
    setPriceLoading(true);
    setPriceAnalysis('');

    const formData = new FormData();
    formData.append('file', priceFile);
    formData.append('categories', priceCategories);

    try {
      const res = await fetch('/api/analyze-price', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setPriceAnalysis(data.analysis);
      }
    } catch (err) {
      setPriceAnalysis("Ошибка анализа: " + err.message);
    } finally {
      setPriceLoading(false);
    }
  };

  // Markdown renderer parser
  const renderMarkdown = (text) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    let inList = false;
    let tableLines = [];
    let inTable = false;
    const elements = [];

    const processText = (t) => {
      return t
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
    };

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();

      if (line.startsWith('|')) {
        inTable = true;
        tableLines.push(line);
        continue;
      } else if (inTable && !line.startsWith('|')) {
        inTable = false;
        elements.push(renderTableHTML(tableLines));
        tableLines = [];
      }

      if (line.startsWith('### ')) {
        elements.push(<h4 key={i} style={{ fontSize: '1rem', fontWeight: 'bold', marginTop: '1rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>{line.substring(4)}</h4>);
      } else if (line.startsWith('## ')) {
        elements.push(<h3 key={i} style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '1.25rem', marginBottom: '0.75rem', color: 'var(--primary)' }}>{line.substring(3)}</h3>);
      } else if (line.startsWith('# ')) {
        elements.push(<h2 key={i} style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '1.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>{line.substring(2)}</h2>);
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        if (!inList) {
          inList = true;
        }
        elements.push(<li key={i} style={{ marginLeft: '1.25rem', listStyleType: 'disc', fontSize: '0.75rem', margin: '0.25rem 0', color: '#cbd5e1' }} dangerouslySetInnerHTML={{ __html: processText(line.substring(2)) }}></li>);
      } else {
        if (inList) {
          inList = false;
        }
        if (line !== '') {
          elements.push(<p key={i} style={{ fontSize: '0.75rem', margin: '0.5rem 0', color: '#cbd5e1', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: processText(line) }}></p>);
        }
      }
    }

    if (inTable) elements.push(renderTableHTML(tableLines));

    return <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>{elements}</div>;
  };

  const renderTableHTML = (tableLines) => {
    if (tableLines.length < 2) return null;
    const parseRow = (rowText) => {
      const cells = rowText.split('|').map(c => c.trim());
      if (cells[0] === '') cells.shift();
      if (cells[cells.length - 1] === '') cells.pop();
      return cells;
    };
    
    const headers = parseRow(tableLines[0]);
    const bodyRows = tableLines.slice(2).map(parseRow);

    return (
      <div className="table-wrapper" style={{ margin: '1rem 0', borderRadius: '12px', border: '1px solid var(--border-glass)' }} key={Math.random()}>
        <table className="markdown-table">
          <thead>
            <tr>
              {headers.map((h, index) => <th key={index}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, rIdx) => (
              <tr key={rIdx}>
                {row.map((cell, cIdx) => <td key={cIdx}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Grooming data
  const groomingZones = {
    1: {
      name: "Голова и морда",
      instructions: "Используйте мягкую щетку-пуходерку вокруг ушей. Будьте осторожны возле глаз. Для усов и подбородка подойдет металлический гребень с мелкими зубьями.",
      tool: "Мягкая пуходерка + Мелкий гребень",
      frequency: "2-3 раза в неделю"
    },
    2: {
      name: "Шея и «воротник»",
      instructions: "Самая густая часть шерсти самоеда. Разделите шерсть горизонтально и прочесывайте слоями (лайн-брашинг) с помощью грабель. Затем вычешите гребнем от корней.",
      tool: "Вычесывающие грабли + Длиннозубый гребень",
      frequency: "Каждые 2 дня"
    },
    3: {
      name: "Грудная клетка",
      instructions: "Шерсть здесь склонна к сваливанию из-за трения о шлейку или ошейник. Тщательно прорабатывайте зону пуходеркой, двигаясь снизу вверх.",
      tool: "Пуходерка",
      frequency: "3 раза в неделю"
    },
    4: {
      name: "Спина и бока",
      instructions: "Шерсть средней жесткости, защищает от влаги. Используйте грабли, чтобы удалить мертвый подшерсток. Вычесывайте слоями по направлению роста шерсти.",
      tool: "Грабли для шерсти + Компрессор",
      frequency: "Раз в неделю"
    },
    5: {
      name: "Передние лапы",
      instructions: "Обратите внимание на локти — там часто образуются колтуны. Прочесывайте гребнем. Выстригайте шерсть между подушечками лап для гигиены.",
      tool: "Гребень средней длины + Ножницы для гигиены лап",
      frequency: "2 раза в неделю"
    },
    6: {
      name: "Живот и пах",
      instructions: "Очень чувствительная зона. Вычесывать только мягкими движениями пуходерки. После операции Бьярки (21.03.2026) в зоне швов ухаживать крайне аккуратно, избегая натяжения.",
      tool: "Мягкая пуходерка + Хлоргексидин для гигиены швов",
      frequency: "Ежедневно (осмотр)"
    },
    7: {
      name: "Задние лапы и «штаны»",
      instructions: "Шерсть очень густая с плотным подшерстком. Прочесывайте слоями, начиная с самого низа. При обнаружении колтунов используйте спрей для облегчения распутывания.",
      tool: "Длиннозубый гребень + Колтунорез (при необходимости)",
      frequency: "Каждые 2-3 дня"
    },
    8: {
      name: "Хвост",
      instructions: "Красивый пушистый хвост вычесывается веерообразно. Положите хвост на колено и аккуратно ведите пуходеркой от основания к кончикам.",
      tool: "Пуходерка + Мягкий гребень",
      frequency: "Раз в неделю"
    }
  };

  const groomingTools = {
    slicker: {
      name: "Пуходерка (Slicker Brush)",
      description: "Инструмент с тонкими металлическими зубцами. Подходит для распутывания мелких узлов, укладки и удаления выпавших волос."
    },
    comb: {
      name: "Металлический гребень",
      description: "Металлическая расческа с длинными зубьями. Необходима для финальной проверки на наличие колтунов до самой кожи."
    },
    rake: {
      name: "Вычесывающие грабли (Undercoat Rake)",
      description: "Инструмент с длинными вращающимися зубцами. Проникает глубоко сквозь остевой волос для удаления линяющего подшерстка."
    }
  };

  return (
    <div className="app-wrapper">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="app-sidebar">
        <div>
          <div className="sidebar-logo">
            <div className="logo-icon">
              <Heart style={{ width: '1.25rem', height: '1.25rem', fill: 'currentColor' }} />
            </div>
            <div className="logo-text">
              <h1>БЬЯРКИ AI</h1>
              <p>Платформа Долголетия</p>
            </div>
          </div>
          
          <nav className="sidebar-nav">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            >
              <Activity style={{ width: '1rem', height: '1rem' }} />
              Дашборд
            </button>
            
            <button 
              onClick={() => setActiveTab('encyclopedia')}
              className={`nav-item ${activeTab === 'encyclopedia' ? 'active' : ''}`}
            >
              <BookOpen style={{ width: '1rem', height: '1rem' }} />
              Самоедопедия
            </button>
            
            <button 
              onClick={() => setActiveTab('prices')}
              className={`nav-item ${activeTab === 'prices' ? 'active' : ''}`}
            >
              <ShoppingBag style={{ width: '1rem', height: '1rem' }} />
              Прайс-анализатор
            </button>
            
            <button 
              onClick={() => setActiveTab('settings')}
              className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            >
              <Settings style={{ width: '1rem', height: '1rem' }} />
              Настройки
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {isDark ? 'Темная тема' : 'Светлая тема'}
          </span>
          <button onClick={toggleTheme} className="theme-toggle-btn">
            {isDark ? <Sun style={{ width: '1rem', height: '1rem' }} /> : <Moon style={{ width: '1rem', height: '1rem' }} />}
          </button>
        </div>
      </aside>

      {/* MAIN VIEW CONTENT */}
      <main className="main-content">
        
        {/* VIEW: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="page-header">
              <div className="page-title">
                <h2>ПАНЕЛЬ ЗДОРОВЬЯ</h2>
                <p>Мониторинг Бьярки в реальном времени</p>
              </div>
              <div className="glass-panel header-badge">
                <Clock style={{ width: '0.85rem', height: '0.85rem' }} />
                <span>{new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>

            <div className="dashboard-grid">
              
              {/* LEFT COLUMN: Profile & Status */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Profile Card */}
                <div className="glass-panel">
                  <div className="profile-card">
                    <div className="avatar-badge">🐾</div>
                    <div className="profile-details">
                      <h3>{profile.name_ru || 'Бьярки'}</h3>
                      <p>Самоед | {profile.age || '10 лет'}</p>
                    </div>
                  </div>
                  <div className="profile-stats">
                    <span>Вес: <strong>{latestLog ? latestLog.weight : profile.current_weight} кг</strong></span>
                    <span>Цель: <strong>{profile.weight_target || 25.0} кг</strong></span>
                  </div>
                </div>

                {/* Health Gauge */}
                <div className="glass-panel">
                  <div className="gauge-container">
                    <span className="gauge-title">ИНДЕКС ЗДОРОВЬЯ</span>
                    <div className="gauge-circle-wrapper">
                      <svg className="gauge-svg" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.04)" strokeWidth="7" fill="transparent" />
                        <circle 
                          cx="50" cy="50" r="40" 
                          stroke={healthScore > 75 ? "var(--color-green)" : healthScore > 40 ? "var(--color-yellow)" : "var(--color-red)"} 
                          strokeWidth="7" fill="transparent" 
                          strokeDasharray={2 * Math.PI * 40}
                          strokeDashoffset={2 * Math.PI * 40 * (1 - healthScore / 100)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="gauge-percentage">{healthScore}%</span>
                    </div>
                    <p className="gauge-explanation">
                      {latestLog 
                        ? `Основан на весе (${latestLog.weight}кг) и активности (${latestLog.activity_minutes}мин).`
                        : "Нет данных для оценки. Введите показатели ниже."}
                    </p>
                  </div>
                </div>

                {/* Quick Add Log */}
                <div className="glass-panel">
                  <span className="form-title">ДОБАВИТЬ ЗАПИСЬ</span>
                  <form onSubmit={handleAddLog} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Вес (кг)</label>
                        <input 
                          type="number" step="0.1" required 
                          value={logWeight} onChange={e => setLogWeight(e.target.value)}
                          placeholder="31.0"
                          className="form-input"
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Акт. (мин)</label>
                        <input 
                          type="number" required 
                          value={logActivity} onChange={e => setLogActivity(e.target.value)}
                          placeholder="45"
                          className="form-input"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Симптомы</label>
                      <input 
                        type="text" 
                        value={logSymptoms} onChange={e => setLogSymptoms(e.target.value)}
                        placeholder="Хромота, вялость..."
                        className="form-input"
                      />
                    </div>
                    <button type="submit" className="btn-primary">
                      <Plus style={{ width: '0.85rem', height: '0.85rem' }} />
                      ОБНОВИТЬ ПОКАЗАТЕЛИ
                    </button>
                  </form>
                </div>
              </div>

              {/* CENTER COLUMN: Chart & Recommendations */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Weight Chart */}
                <div className="glass-panel chart-card-wrapper">
                  <span className="form-title">ДИНАМИКА ВЕСА (КГ)</span>
                  <div className="chart-container-box">
                    <canvas ref={chartRef}></canvas>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="glass-panel">
                  <div className="recommendations-header">
                    <div className="recommendations-title">
                      <Sparkles style={{ width: '0.9rem', height: '0.9rem', color: 'var(--primary)' }} />
                      <span>ИИ-РЕКОМЕНДАЦИИ</span>
                    </div>
                    {recsLoading && <span style={{ fontSize: '0.7rem', color: 'var(--primary)', animation: 'pulse 1.5s infinite' }}>Анализ...</span>}
                  </div>
                  
                  {logs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Для генерации рекомендаций введите хотя бы одну запись здоровья.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {aiReport.recommendations && aiReport.recommendations.length > 0 ? (
                        <div className="recommendations-grid">
                          {aiReport.recommendations.map((rec, i) => (
                            <div key={i} className="recommendation-item">
                              {rec}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding: '1rem', border: '1px solid var(--border-glass)', borderRadius: '12px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Загрузка последних ИИ-рекомендаций...
                        </div>
                      )}
                      
                      {aiReport.risk_assessment && (
                        <div className="ai-evaluation-box">
                          <strong>Оценка рисков бэкенд-агентом:</strong>
                          <p>{aiReport.risk_assessment}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Events Table */}
                <div className="glass-panel">
                  <span className="form-title">ПОСЛЕДНИЕ СОБЫТИЯ</span>
                  <div className="table-wrapper">
                    <table className="history-table">
                      <thead>
                        <tr>
                          <th>Дата</th>
                          <th>Вес</th>
                          <th>Активность</th>
                          <th>Симптомы</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.slice().reverse().slice(0, 5).map((log, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: '500', color: 'var(--text-main)' }}>{log.date}</td>
                            <td>{log.weight} кг</td>
                            <td>{log.activity_minutes} мин</td>
                            <td>
                              {log.symptoms && log.symptoms.length > 0 ? (
                                <span className="symptom-tag">{log.symptoms.join(', ')}</span>
                              ) : '---'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* VIEW: ENCYCLOPEDIA (САМОЕДОПЕДИЯ) */}
        {activeTab === 'encyclopedia' && (
          <div className="space-y-6 animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="page-header">
              <div className="page-title">
                <h2>САМОЕДОПЕДИЯ</h2>
                <p>Интерактивное руководство по уходу, питанию и грумингу самоеда</p>
              </div>
            </div>

            <div className="grooming-container">
              
              {/* Left Side: Grooming guide & SVG Map */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="glass-panel">
                  <div className="grooming-toolbar">
                    <span className="grooming-toolbar-title">
                      <Scissors style={{ width: '0.9rem', height: '0.9rem', color: 'var(--primary)' }} />
                      Интерактивная карта груминга самоеда
                    </span>
                    <div className="tool-chip-group">
                      {Object.keys(groomingTools).map(tKey => (
                        <button 
                          key={tKey}
                          onClick={() => setSelectedTool(tKey)}
                          className={`tool-chip-btn ${selectedTool === tKey ? 'active' : ''}`}
                        >
                          {tKey === 'slicker' ? '🧤 Пуходерка' : tKey === 'comb' ? '🪮 Гребень' : '🛠️ Грабли'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="dog-map-container">
                    <img 
                      src="/samoyed-profile.jpg" 
                      alt="Самоед Бьярки" 
                      className="dog-map-image" 
                    />
                    
                    {/* Hotspots */}
                    {Object.keys(groomingZones).map(zoneId => {
                      const id = parseInt(zoneId);
                      const coords = {
                        1: { left: '24%', top: '22%' },
                        2: { left: '36%', top: '26%' },
                        3: { left: '32%', top: '48%' },
                        4: { left: '56%', top: '32%' },
                        5: { left: '38%', top: '78%' },
                        6: { left: '56%', top: '58%' },
                        7: { left: '74%', top: '72%' },
                        8: { left: '86%', top: '35%' }
                      }[id];

                      return (
                        <button
                          key={zoneId}
                          onClick={() => setSelectedZone(id)}
                          className={`hotspot-button ${selectedZone === id ? 'active' : ''}`}
                          style={{ left: coords.left, top: coords.top }}
                          title={groomingZones[zoneId].name}
                        >
                          {zoneId}
                        </button>
                      );
                    })}

                    <div className="svg-map-info-hint">
                      Нажмите на цифры для советов по грумингу определенных зон Бьярки
                    </div>
                  </div>

                  {selectedZone ? (
                    <div className="grooming-info-panel animate-fade-in">
                      <div className="grooming-info-header">
                        <h4>Зона {selectedZone}: {groomingZones[selectedZone].name}</h4>
                        <span className="frequency-badge">Частота: {groomingZones[selectedZone].frequency}</span>
                      </div>
                      <p className="grooming-info-desc">{groomingZones[selectedZone].instructions}</p>
                      <div className="grooming-info-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          Рекомендуемый инвентарь: <strong>{groomingZones[selectedZone].tool}</strong>
                        </div>
                        {zoneArticleMap[selectedZone] && (
                          <button 
                            onClick={() => openArticle(zoneArticleMap[selectedZone].path, zoneArticleMap[selectedZone].title)}
                            className="action-link-btn"
                          >
                            {zoneArticleMap[selectedZone].label} →
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--border-glass)', borderRadius: '12px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Выберите зону на силуэте собаки для просмотра специфических рекомендаций.
                    </div>
                  )}
                </div>

                {/* INGREDIENT ANALYZER (AI COMPOSITION CHECK) */}
                <div className="glass-panel">
                  <span className="grooming-toolbar-title" style={{ marginBottom: '1rem' }}>
                    <Sparkles style={{ width: '0.9rem', height: '0.9rem', color: 'var(--primary)' }} />
                    ИИ-анализатор состава корма и вкусняшек
                  </span>
                  <form onSubmit={handleAnalyzeNutrition} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Введите ингредиенты корма (через запятую)</label>
                      <textarea 
                        rows="3" required
                        value={nutritionIngredients} onChange={e => setNutritionIngredients(e.target.value)}
                        placeholder="Например: свежий ягненок (26%), дегидратированный ягненок (25%), сладкий картофель, рыбий жир, ..."
                        className="form-textarea"
                      />
                    </div>
                    <button 
                      type="submit" disabled={nutritionLoading}
                      className="btn-primary" style={{ width: 'fit-content' }}
                    >
                      {nutritionLoading ? "Анализ состава ИИ..." : "АНАЛИЗИРОВАТЬ СОСТАВ"}
                    </button>
                  </form>
                  
                  {nutritionAnalysis && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(9, 13, 22, 0.4)', borderRadius: '12px', border: '1px solid var(--border-glass)', maxHeight: '350px', overflowY: 'auto' }} className="animate-fade-in">
                      {renderMarkdown(nutritionAnalysis)}
                    </div>
                  )}
                </div>

                {/* KNOWLEDGE BASE EXPLORER */}
                <div className="glass-panel knowledge-section">
                  <div className="search-filter-bar">
                    <span className="grooming-toolbar-title">
                      <BookOpen style={{ width: '0.9rem', height: '0.9rem', color: 'var(--primary)' }} />
                      Экспертная библиотека знаний самоеда
                    </span>
                    <input 
                      type="text" 
                      placeholder="🔍 Поиск по статьям и мануалам..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="form-input"
                      style={{ maxWidth: '260px', fontSize: '0.75rem' }}
                    />
                  </div>

                  <div className="category-pills">
                    <button 
                      onClick={() => setSelectedCategory('all')} 
                      className={`category-pill ${selectedCategory === 'all' ? 'active' : ''}`}
                    >
                      📚 Все материалы ({knowledgeTree.reduce((acc, cat) => acc + cat.articles.length, 0)})
                    </button>
                    {knowledgeTree.map(cat => (
                      <button 
                        key={cat.category_key}
                        onClick={() => setSelectedCategory(cat.category_key)}
                        className={`category-pill ${selectedCategory === cat.category_key ? 'active' : ''}`}
                      >
                        {cat.category_name} ({cat.articles.length})
                      </button>
                    ))}
                  </div>

                  <div className="article-grid">
                    {knowledgeTree.flatMap(c => c.articles.map(a => ({ ...a, category_name: c.category_name, category_key: c.category_key })))
                      .filter(art => {
                        const matchesCat = selectedCategory === 'all' || art.category_key === selectedCategory;
                        const matchesSearch = !searchQuery || 
                          art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          art.category_name.toLowerCase().includes(searchQuery.toLowerCase());
                        return matchesCat && matchesSearch;
                      })
                      .map(art => (
                        <div 
                          key={art.path} 
                          className="article-card"
                          onClick={() => openArticle(art.path, art.title)}
                        >
                          <div className="article-card-header">
                            <span className="article-card-title">{art.title}</span>
                          </div>
                          <div className="article-card-footer">
                            <span className="category-tag">{art.category_name}</span>
                            <span style={{ color: 'var(--primary)', fontWeight: '700' }}>Читать →</span>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>

              {/* Right Side: Educational details & active tools */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="glass-panel">
                  <span className="tool-catalog-title" style={{ display: 'block', marginBottom: '0.75rem' }}>Свойства шерсти самоеда</span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '1rem' }}>
                    У самоедов роскошный двойной шерстный покров: мягкий, короткий, плотный подшерсток и более жесткая, длинная, прямая остевая шерсть.
                  </p>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <li style={{ display: 'flex', gap: '0.5rem', fontSize: '0.7rem' }}>
                      <CheckCircle style={{ width: '1rem', height: '1rem', color: 'var(--color-green)', flexShrink: 0 }} />
                      <span><strong>Самоочищение:</strong> Грязь высыхает и сама осыпается, часто купать собаку не нужно (раз в 2-3 месяца).</span>
                    </li>
                    <li style={{ display: 'flex', gap: '0.5rem', fontSize: '0.7rem' }}>
                      <CheckCircle style={{ width: '1rem', height: '1rem', color: 'var(--color-green)', flexShrink: 0 }} />
                      <span><strong>Колтуны:</strong> Склонны образовываться за ушами, на локтях и на «штанах». Требуют аккуратного разбора.</span>
                    </li>
                    <li style={{ display: 'flex', gap: '0.5rem', fontSize: '0.7rem' }}>
                      <CheckCircle style={{ width: '1rem', height: '1rem', color: 'var(--color-green)', flexShrink: 0 }} />
                      <span><strong>Стрижка:</strong> Категорически запрещено брить самоедов налысо — это нарушает терморегуляцию и может вызвать алопецию.</span>
                    </li>
                  </ul>
                </div>

                <div className="glass-panel">
                  <span className="tool-catalog-title" style={{ display: 'block', marginBottom: '1rem' }}>Справочник инструментов</span>
                  <div>
                    {Object.keys(groomingTools).map(tKey => (
                      <div 
                        key={tKey}
                        onClick={() => setSelectedTool(tKey)}
                        className={`tool-catalog-card ${selectedTool === tKey ? 'active' : ''}`}
                      >
                        <strong>{groomingTools[tKey].name}</strong>
                        <p>{groomingTools[tKey].description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* VIEW: PRICE ANALYZER */}
        {activeTab === 'prices' && (
          <div className="space-y-6 animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="page-header">
              <div className="page-title">
                <h2>ИИ-АНАЛИЗАТОР ПРАЙСОВ</h2>
                <p>Загрузите прайс-лист магазина, чтобы ИИ подобрал лакомства и корма с учетом здоровья Бьярки</p>
              </div>
            </div>

            <div className="grooming-container">
              
              {/* Left Column: Form */}
              <div className="glass-panel">
                <span className="tool-catalog-title" style={{ display: 'block', marginBottom: '1rem' }}>Параметры анализа</span>
                <form onSubmit={handleAnalyzePrice} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Категории товаров (через запятую)</label>
                    <input 
                      type="text" required
                      value={priceCategories} onChange={e => setPriceCategories(e.target.value)}
                      placeholder="лакомства, сухой корм, хондропротекторы"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Прайс-лист (TXT, CSV или EXCEL)</label>
                    <input 
                      type="file" required
                      accept=".txt,.csv,.xlsx,.xls"
                      onChange={e => setPriceFile(e.target.files[0])}
                      style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
                    />
                  </div>
                  
                  <button 
                    type="submit" disabled={priceLoading || !priceFile}
                    className="btn-primary"
                  >
                    {priceLoading ? "Подбираем товары ИИ..." : "ЗАПУСТИТЬ ИИ ПОДБОР"}
                  </button>
                </form>

                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)', fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <strong style={{ color: 'var(--text-main)' }}>Что проверяет ИИ:</strong>
                  <p>✓ Соответствие веса Бьярки (31кг при цели 25кг - подбор диетических вкусняшек).</p>
                  <p>✓ Безопасность швов после операции 21.03.2026.</p>
                  <p>✓ Поддержку суставов пожилого самоеда.</p>
                </div>
              </div>

              {/* Right Column: Results */}
              <div className="glass-panel" style={{ minHeight: '350px' }}>
                <span className="tool-catalog-title" style={{ display: 'block', marginBottom: '1rem' }}>Результаты отбора</span>
                
                {priceLoading ? (
                  <div className="loader-box">
                    <div className="spinner"></div>
                    <span className="loader-text">ИИ читает ваш прайс-лист и сверяет его со здоровьем Бьярки...</span>
                  </div>
                ) : priceAnalysis ? (
                  <div className="animate-fade-in" style={{ overflowY: 'auto', maxHeight: '550px' }}>
                    {renderMarkdown(priceAnalysis)}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '5rem 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Прайс-лист не проанализирован. Загрузите файл слева.
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* VIEW: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="page-header">
              <div className="page-title">
                <h2>НАСТРОЙКИ</h2>
                <p>Параметры баз данных, ИИ-моделей и медицинских показателей</p>
              </div>
            </div>

            <div className="grid-2-cols">
              
              {/* Database & API Configuration */}
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 className="grooming-toolbar-title" style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
                  <Database style={{ width: '1rem', height: '1rem', color: 'var(--primary)' }} />
                  Интеграции и База Данных
                </h3>
                
                <div className="db-status-badge">
                  🟢 Локальная БД SQLite подключена (bjarki_health.db)
                </div>

                <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Google Gemini API Key</label>
                    <input 
                      type="password" 
                      value={geminiKeyInput} onChange={e => setGeminiKeyInput(e.target.value)}
                      placeholder="Введите API-ключ Gemini (AIzaSy...)"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Ollama URL (Локальный сервер ИИ)</label>
                    <input 
                      type="text" 
                      value={ollamaUrlInput} onChange={e => setOllamaUrlInput(e.target.value)}
                      placeholder="http://localhost:11434"
                      className="form-input"
                    />
                  </div>
                  <button type="submit" className="btn-primary" style={{ width: 'fit-content' }}>
                    СОХРАНИТЬ КОНФИГУРАЦИЮ ИИ
                  </button>
                </form>
              </div>

              {/* Profile Editing */}
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 className="grooming-toolbar-title" style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
                  <Heart style={{ width: '1rem', height: '1rem', color: 'var(--primary)' }} />
                  Профиль здоровья Бьярки
                </h3>

                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Целевой вес (кг)</label>
                      <input 
                        type="number" step="0.1" required
                        value={targetWeightInput} onChange={e => setTargetWeightInput(e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Активность (мин)</label>
                      <input 
                        type="number" required
                        value={targetActivityInput} onChange={e => setTargetActivityInput(e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Текущий рацион</label>
                    <input 
                      type="text" required
                      value={dietInput} onChange={e => setDietInput(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <button type="submit" className="btn-primary" style={{ width: 'fit-content' }}>
                    ОБНОВИТЬ МЕД-ПРОФИЛЬ
                  </button>
                </form>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* ARTICLE READER MODAL */}
      {activeArticle && (
        <div className="modal-overlay" onClick={() => setActiveArticle(null)}>
          <div className="modal-container animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-info">
                <h3>{activeArticle.title}</h3>
                <p style={{ marginTop: '0.2rem' }}>
                  ⏱️ ~{activeArticle.read_time_min} мин чтения • Путь: <code>{activeArticle.path}</code>
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setActiveArticle(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              {renderMarkdown(activeArticle.content)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
