import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, Send, Users, AlertCircle, Info, ChevronDown, ChevronUp, Check } from 'lucide-react';

const App = () => {
  // --- State ---
  const [friends, setFriends] = useState(1000);
  const [sendsPerMonth, setSendsPerMonth] = useState(4);
  // manualLStepPlan: 'auto', 'free', 'start', 'standard', 'pro', 'bulk10', 'bulk30', 'bulk50', 'bulk100', 'none'
  const [manualLStepPlan, setManualLStepPlan] = useState('auto');
  const [includeTax, setIncludeTax] = useState(true);

  // --- Constants ---
  const TAX_RATE = 1.1;

  // LINE Official Account Plans (Base Prices - Tax Excluded)
  const LINE_PLANS = {
    communication: { name: 'コミュニケーション', price: 0, limit: 200, canExceed: false },
    light: { name: 'ライト', price: 5000, limit: 5000, canExceed: false },
    standard: { name: 'スタンダード', price: 15000, limit: 30000, canExceed: true },
  };

  // L-Step Plans (Base Prices - Tax Excluded)
  // Updated with latest limits (Start: 5000, Standard: 30000, Pro: 50000)
  // Prices derived from tax-included official prices:
  // Free: 0 (limit 200)
  // Start: 2,980(inc) -> ~2,709(exc)
  // Standard: 21,780(inc) -> 19,800(exc)
  // Pro: 32,780(inc) -> 29,800(exc)
  // Bulk10: 87,780(inc) -> 79,800(exc)
  // Bulk30: 131,780(inc) -> 119,800(exc)
  // Bulk50: 142,780(inc) -> 129,800(exc)
  // Bulk100: 197,780(inc) -> 179,800(exc)
  const LSTEP_PLANS = {
    free: { name: 'フリー', price: 0, limit: 200, type: 'normal' },
    start: { name: 'スタート', price: 2709, limit: 5000, type: 'normal' },
    standard: { name: 'スタンダード', price: 19800, limit: 30000, type: 'normal' },
    pro: { name: 'プロ', price: 29800, limit: 50000, type: 'normal' },
    bulk10: { name: '大量送信10万', price: 79800, limit: 100000, type: 'bulk' },
    bulk30: { name: '大量送信30万', price: 119800, limit: 300000, type: 'bulk' },
    bulk50: { name: '大量送信50万', price: 129800, limit: 500000, type: 'bulk' },
    bulk100: { name: '大量送信100万', price: 179800, limit: 1000000, type: 'bulk' },
  };
  
  // --- Calculations ---

  const totalMessages = friends * sendsPerMonth;

  // Calculate LINE Official Account Cost
  const lineCostData = useMemo(() => {
    let plan = 'communication';
    let basePrice = 0;
    let additionalCost = 0;
    let messageCostBreakdown = [];

    // Plan Selection Logic based on volume
    if (totalMessages <= 200) {
      plan = 'communication';
      basePrice = LINE_PLANS.communication.price;
    } else if (totalMessages <= 5000) {
      plan = 'light';
      basePrice = LINE_PLANS.light.price;
    } else {
      plan = 'standard';
      basePrice = LINE_PLANS.standard.price;

      // Additional Message Calculation (Standard Plan Only)
      const extraMessages = Math.max(0, totalMessages - LINE_PLANS.standard.limit);
      
      if (extraMessages > 0) {
        // LINE Tiered Pricing Logic (2023 Revision)
        const tiers = [
          { limit: 50000, price: 3.0 },
          { limit: 100000, price: 2.8 },
          { limit: 200000, price: 2.6 },
          { limit: 300000, price: 2.4 },
          { limit: 400000, price: 2.2 },
          { limit: 500000, price: 2.0 },
          { limit: 600000, price: 1.9 },
          { limit: 700000, price: 1.8 },
          { limit: 800000, price: 1.7 },
          { limit: 900000, price: 1.6 },
          { limit: 1000000, price: 1.5 },
          { limit: Infinity, price: 1.4 } // Simply 1.4 for > 1M for this sim (simplified)
        ];

        let remaining = extraMessages;
        let previousLimit = 30000; // Standard plan free limit

        for (const tier of tiers) {
          if (remaining <= 0) break;
          
          const tierCapacity = tier.limit - previousLimit;
          const countInTier = Math.min(remaining, tierCapacity);
          
          additionalCost += countInTier * tier.price;
          messageCostBreakdown.push({ count: countInTier, unit: tier.price, total: countInTier * tier.price });
          
          remaining -= countInTier;
          previousLimit = tier.limit;
        }
      }
    }

    return {
      planName: LINE_PLANS[plan].name,
      basePrice,
      additionalCost,
      total: basePrice + additionalCost
    };
  }, [totalMessages]);

  // Calculate L-Step Cost
  const lStepCostData = useMemo(() => {
    if (manualLStepPlan === 'none') {
      return { planKey: 'none', planName: '利用なし', basePrice: 0, extraCost: 0, total: 0, isAutoUpgraded: false, isExceeded: false };
    }

    let planKey = manualLStepPlan;
    let isAutoUpgraded = false;
    
    // Auto-select logic
    if (manualLStepPlan === 'auto') {
      if (totalMessages <= 200) planKey = 'free';
      else if (totalMessages <= 5000) planKey = 'start';
      else if (totalMessages <= 30000) planKey = 'standard';
      else if (totalMessages <= 50000) planKey = 'pro';
      else if (totalMessages <= 100000) planKey = 'bulk10';
      else if (totalMessages <= 300000) planKey = 'bulk30';
      else if (totalMessages <= 500000) planKey = 'bulk50';
      else planKey = 'bulk100'; // Cap at bulk100 for auto, but show warning if exceeded
    }

    // Determine Base Price
    let basePrice = LSTEP_PLANS[planKey].price;
    const limit = LSTEP_PLANS[planKey].limit;
    
    // Check if limit is exceeded (for manual selection or max plan)
    const isExceeded = totalMessages > limit;

    return {
      planKey,
      planName: LSTEP_PLANS[planKey].name,
      basePrice,
      total: basePrice, 
      limit,
      isAutoUpgraded,
      isExceeded
    };
  }, [totalMessages, manualLStepPlan]);

  // Totals
  const finalLineTotal = includeTax ? Math.floor(lineCostData.total * TAX_RATE) : lineCostData.total;
  const finalLStepTotal = includeTax ? Math.floor(lStepCostData.total * TAX_RATE) : lStepCostData.total;
  const grandTotal = finalLineTotal + finalLStepTotal;
  const cpm = totalMessages > 0 ? (grandTotal / totalMessages).toFixed(2) : 0;

  // --- Components ---

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(val);
  };

  const PlanCard = ({ title, price, features, selected, onClick, color, isBulk }) => (
    <div 
      onClick={onClick}
      className={`border-2 rounded-xl p-3 md:p-4 cursor-pointer transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
        selected ? `border-${color}-500 bg-${color}-50 shadow-md` : 'border-gray-200 hover:border-gray-300'
      } ${isBulk ? 'min-h-[100px]' : 'min-h-[120px]'}`}
    >
      {selected && (
        <div className={`absolute top-0 right-0 bg-${color}-500 text-white text-xs px-2 py-1 rounded-bl-lg font-bold flex items-center gap-1`}>
          <Check className="w-3 h-3" /> 選択中
        </div>
      )}
      <div>
        <h3 className={`font-bold ${isBulk ? 'text-sm text-gray-600' : 'text-gray-700'}`}>{title}</h3>
        <p className={`${isBulk ? 'text-lg' : 'text-xl'} font-bold mt-1 text-gray-900`}>{price}</p>
      </div>
      <p className="text-xs text-gray-500 mt-2">{features}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="mb-8 text-center md:text-left">
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center justify-center md:justify-start gap-3">
            <Calculator className="w-8 h-8 text-green-600" />
            LINE公式 + Lステップ 費用シミュレーター
          </h1>
          <p className="mt-2 text-gray-500">
            配信数に応じたLINE公式アカウントの従量課金と、Lステップのプラン料金（大量送信含む）を自動計算します。
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Inputs */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Input Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                配信条件の設定
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    友だち数 (ターゲットリーチ数)
                  </label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="100" max="200000" step="100" 
                      value={friends}
                      onChange={(e) => setFriends(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                    />
                    <div className="w-36 relative">
                      <input
                        type="number"
                        value={friends}
                        onChange={(e) => setFriends(Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg p-2 text-right pr-8 focus:ring-2 focus:ring-green-500 outline-none"
                      />
                      <span className="absolute right-3 top-2 text-gray-400 text-sm">人</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>100人</span>
                    <span>20万人</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    月間配信回数 (1人あたり)
                  </label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="1" max="30" step="1"
                      value={sendsPerMonth}
                      onChange={(e) => setSendsPerMonth(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                    />
                    <div className="w-36 relative">
                      <input
                        type="number"
                        value={sendsPerMonth}
                        onChange={(e) => setSendsPerMonth(Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg p-2 text-right pr-8 focus:ring-2 focus:ring-green-500 outline-none"
                      />
                      <span className="absolute right-3 top-2 text-gray-400 text-sm">回</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
                  <span className="text-blue-900 font-bold">月間総配信数</span>
                  <span className="text-2xl font-bold text-blue-700">{totalMessages.toLocaleString()} <span className="text-sm font-normal">通</span></span>
                </div>
              </div>
            </div>

            {/* L Step Plan Selection */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-500" />
                Lステップ プラン選択
              </h2>
              
              <div className="mb-6">
                <label className="flex items-center gap-2 cursor-pointer mb-4 bg-indigo-50 p-3 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors">
                   <input 
                    type="radio" 
                    checked={manualLStepPlan === 'auto'}
                    onChange={() => setManualLStepPlan('auto')}
                    className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                  />
                  <div>
                    <span className="text-sm font-bold text-indigo-900 block">配信数に合わせて自動選択</span>
                    <span className="text-xs text-indigo-700 block">一番安くなる最適なプランを自動で適用します</span>
                  </div>
                </label>
                
                {/* Standard Plans */}
                <div className="mb-4">
                   <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">通常プラン</h3>
                   <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                     <PlanCard 
                      title="フリー" 
                      price={includeTax ? "¥0" : "¥0"}
                      features="月200通"
                      selected={manualLStepPlan === 'free' || (manualLStepPlan === 'auto' && lStepCostData.planKey === 'free')}
                      onClick={() => setManualLStepPlan('free')}
                      color="indigo"
                    />
                     <PlanCard 
                      title="スタート" 
                      price={includeTax ? "¥2,980" : "¥2,709"}
                      features="月5,000通"
                      selected={manualLStepPlan === 'start' || (manualLStepPlan === 'auto' && lStepCostData.planKey === 'start')}
                      onClick={() => setManualLStepPlan('start')}
                      color="indigo"
                    />
                    <PlanCard 
                      title="スタンダード" 
                      price={includeTax ? "¥21,780" : "¥19,800"}
                      features="月3万通"
                      selected={manualLStepPlan === 'standard' || (manualLStepPlan === 'auto' && lStepCostData.planKey === 'standard')}
                      onClick={() => setManualLStepPlan('standard')}
                      color="indigo"
                    />
                    <PlanCard 
                      title="プロ" 
                      price={includeTax ? "¥32,780" : "¥29,800"}
                      features="月5万通"
                      selected={manualLStepPlan === 'pro' || (manualLStepPlan === 'auto' && lStepCostData.planKey === 'pro')}
                      onClick={() => setManualLStepPlan('pro')}
                      color="indigo"
                    />
                    <PlanCard 
                      title="利用なし" 
                      price="¥0" 
                      features="LINE公式のみ"
                      selected={manualLStepPlan === 'none'}
                      onClick={() => setManualLStepPlan('none')}
                      color="gray"
                    />
                  </div>
                </div>

                {/* Bulk Plans */}
                <div className="mb-2">
                   <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">大量送信プラン</h3>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                     <PlanCard 
                      title="10万通" 
                      price={includeTax ? "¥87,780" : "¥79,800"}
                      features="~10万通"
                      selected={manualLStepPlan === 'bulk10' || (manualLStepPlan === 'auto' && lStepCostData.planKey === 'bulk10')}
                      onClick={() => setManualLStepPlan('bulk10')}
                      color="purple"
                      isBulk
                    />
                    <PlanCard 
                      title="30万通" 
                      price={includeTax ? "¥131,780" : "¥119,800"}
                      features="~30万通"
                      selected={manualLStepPlan === 'bulk30' || (manualLStepPlan === 'auto' && lStepCostData.planKey === 'bulk30')}
                      onClick={() => setManualLStepPlan('bulk30')}
                      color="purple"
                      isBulk
                    />
                    <PlanCard 
                      title="50万通" 
                      price={includeTax ? "¥142,780" : "¥129,800"}
                      features="~50万通"
                      selected={manualLStepPlan === 'bulk50' || (manualLStepPlan === 'auto' && lStepCostData.planKey === 'bulk50')}
                      onClick={() => setManualLStepPlan('bulk50')}
                      color="purple"
                      isBulk
                    />
                    <PlanCard 
                      title="100万通" 
                      price={includeTax ? "¥197,780" : "¥179,800"}
                      features="~100万通"
                      selected={manualLStepPlan === 'bulk100' || (manualLStepPlan === 'auto' && lStepCostData.planKey === 'bulk100')}
                      onClick={() => setManualLStepPlan('bulk100')}
                      color="purple"
                      isBulk
                    />
                  </div>
                </div>

                {lStepCostData.isExceeded && manualLStepPlan !== 'none' && (
                  <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-sm flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-amber-600" />
                    <div>
                      <p className="font-bold">選択中のプラン上限（{lStepCostData.limit.toLocaleString()}通）を超えています。</p>
                      <p className="mt-1">
                        現在 {totalMessages.toLocaleString()}通の配信が設定されています。
                        {lStepCostData.limit < 1000000 ? '上位プランを選択するか、配信数を調整してください。' : '100万通を超える場合は個別見積もりとなる可能性があります。'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Tax Toggle */}
            <div className="flex items-center justify-end gap-2">
               <label className="flex items-center gap-2 cursor-pointer select-none">
                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${includeTax ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${includeTax ? 'translate-x-4' : ''}`}></div>
                </div>
                <input type="checkbox" className="hidden" checked={includeTax} onChange={() => setIncludeTax(!includeTax)} />
                <span className="text-sm font-medium text-gray-600">税込表示</span>
              </label>
            </div>

          </div>

          {/* Right Column: Result */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden sticky top-6">
              <div className="bg-gray-900 p-6 text-white">
                <h3 className="text-sm font-medium text-gray-300 mb-1">月額費用 合計見積もり</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold tracking-tight">{formatCurrency(grandTotal)}</span>
                  <span className="text-sm text-gray-400">{includeTax ? '(税込)' : '(税抜)'}</span>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-gray-400 border-t border-gray-700 pt-4">
                  <span>1通あたりの配信コスト (CPM)</span>
                  <span className="text-white font-bold">¥{cpm}</span>
                </div>
              </div>

              <div className="p-6 space-y-6">
                
                {/* LINE Breakdown */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-green-600 flex items-center gap-2">
                      <img src="[https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg](https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg)" alt="LINE" className="w-5 h-5" />
                      LINE公式アカウント
                    </h4>
                    <span className="font-bold text-gray-900">{formatCurrency(finalLineTotal)}</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">プラン: {lineCostData.planName}</span>
                      <span>{formatCurrency(includeTax ? lineCostData.basePrice * TAX_RATE : lineCostData.basePrice)}</span>
                    </div>
                    {lineCostData.additionalCost > 0 && (
                       <div className="flex justify-between text-orange-600">
                        <span className="flex items-center gap-1">追加メッセージ料金 <Info className="w-3 h-3"/></span>
                        <span>+{formatCurrency(includeTax ? lineCostData.additionalCost * TAX_RATE : lineCostData.additionalCost)}</span>
                      </div>
                    )}
                    {totalMessages > 200 && totalMessages <= 5000 && (
                      <div className="text-xs text-gray-400 mt-1">※ライトプランは追加メッセージ不可。上限5,000通を超えると送信できません。</div>
                    )}
                  </div>
                </div>

                {/* L Step Breakdown */}
                {manualLStepPlan !== 'none' && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-indigo-600 flex items-center gap-2">
                        <div className="w-5 h-5 bg-indigo-600 rounded-md flex items-center justify-center text-white text-xs font-bold">L</div>
                        Lステップ
                      </h4>
                      <span className="font-bold text-gray-900">{formatCurrency(finalLStepTotal)}</span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">プラン: {lStepCostData.planName}</span>
                        <span>{formatCurrency(includeTax ? lStepCostData.basePrice * TAX_RATE : lStepCostData.basePrice)}</span>
                      </div>
                      
                      {/* Bulk plans include high volume, no extra blocks displayed here for simplicity unless exceeded logic added later */}
                      
                      <div className="text-xs text-gray-400 mt-2 flex gap-1">
                        <Info className="w-3 h-3 mt-0.5" />
                        <span>
                          {lStepCostData.planKey.startsWith('bulk') 
                            ? '大量送信プランは初期費用が別途発生しないプランとして計算しています。' 
                            : 'スタンダード/プロプランは初期費用が無料のキャンペーンが適用される場合があります。'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="text-xs text-gray-400 text-center leading-relaxed">
                  ※本シミュレーションは概算です。正確な見積もりは各社公式サイトをご確認ください。<br/>
                  ※LINE公式アカウントの追加メッセージ料金は段階的に単価が変動します。<br/>
                  ※Lステップ大量送信プランの詳細は正規代理店等へお問い合わせください。
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
