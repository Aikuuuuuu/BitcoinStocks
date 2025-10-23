// Extended Bitcoin-related coins
const COINS = [
  'bitcoin','wrapped-bitcoin','renbtc','tbtc','lightning-bitcoin','bitcoin-cash','bitcoin-sv','bitcoin-gold',
  'synthetix-bitcoin','pbtc','ethereum','tether','bnb','solana','xrp','dogecoin','cardano','shiba-inu','avalanche',
  'tron','polkadot','polygon','litecoin','chainlink'
];

const dashboard = document.getElementById('dashboard');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalCanvas = document.getElementById('modalCanvas');
const tooltip = document.getElementById('tooltip');
const closeBtn = document.getElementById('closeModal');

let modalChart = null;
let DATASTORE = {};

// Fetch all coins data once
async function fetchAllData() {
  const res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COINS.join(',')}&order=market_cap_desc&per_page=100&page=1&sparkline=true`);
  const data = await res.json();
  data.forEach(c => DATASTORE[c.id] = c);
  return data;
}

// Create each widget
function createWidget(coinData){
  const widget = document.createElement('div');
  widget.className='widget';
  const changePct = coinData.price_change_percentage_24h?.toFixed(2) || '0';
  widget.innerHTML = `
    <div class="header">
      <div>
        <div class="title">${coinData.name}</div>
        <div class="subtitle">${changePct>=0?`<span style="color:var(--accent);font-weight:800">+${changePct}%</span>`:`<span style="color:var(--danger);font-weight:800">${changePct}%</span>`}</div>
      </div>
      <div class="stats">Price: $${coinData.current_price.toLocaleString()}</div>
    </div>
    <canvas></canvas>
  `;
  dashboard.appendChild(widget);

  // Sparkline
  const ctx = widget.querySelector('canvas').getContext('2d');
  const sparkline = coinData.sparkline_in_7d.price;
  const g = ctx.createLinearGradient(0,0,0,120);
  g.addColorStop(0,'rgba(22,225,184,0.22)');
  g.addColorStop(1,'rgba(22,225,184,0.03)');
  new Chart(ctx,{type:'line',data:{labels:sparkline.map((_,i)=>i),datasets:[{data:sparkline,borderColor:changePct>=0?'rgba(22,225,184,1)':'rgba(234,57,67,1)',borderWidth:2,pointRadius:0,fill:true,backgroundColor:g,tension:0.3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{display:false},y:{display:false}},animation:{duration:400}}});

  // Click to open modal
  widget.addEventListener('click',()=>{
    openModal(coinData.id);
  });
}

// Open modal
function openModal(id){
  const coin = DATASTORE[id];
  if(!coin) return;
  modal.classList.add('active');
  modalTitle.textContent = coin.name;

  // Use sparkline as chart data (fast)
  const prices = coin.sparkline_in_7d.price;
  const timestamps = prices.map((_,i)=>i);

  if(modalChart) modalChart.destroy();
  const ctx = modalCanvas.getContext('2d');
  const g = ctx.createLinearGradient(0,0,0,420);
  g.addColorStop(0,'rgba(22,225,184,0.22)');
  g.addColorStop(1,'rgba(22,225,184,0.03)');

  modalChart = new Chart(ctx,{type:'line',data:{labels:timestamps,datasets:[{data:prices,borderColor:prices[prices.length-1]-prices[0]>=0?'rgba(22,225,184,1)':'rgba(234,57,67,1)',borderWidth:2.6,pointRadius:0,fill:true,backgroundColor:g,tension:0.24}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{display:false},y:{display:false}},animation:{duration:420}}});

  // Tooltip
  modalCanvas.onmousemove = function(evt){
    const rect=modalCanvas.getBoundingClientRect();
    const x=evt.clientX-rect.left;
    const idx=Math.round(x/rect.width*(prices.length-1));
    if(idx<0||idx>=prices.length){tooltip.style.display='none';return;}
    tooltip.style.display='block';
    tooltip.style.left=(evt.clientX-rect.left)+'px';
    tooltip.style.top=(evt.clientY-rect.top)+'px';
    tooltip.innerHTML = `${coin.name} — <span style="color:var(--accent)">$${Number(prices[idx]).toLocaleString()}</span>`;
  };
  modalCanvas.onmouseleave = ()=>tooltip.style.display='none';
}

// Modal close
closeBtn.addEventListener('click', ()=>{modal.classList.remove('active');});
modal.addEventListener('click', e=>{if(e.target===modal) modal.classList.remove('active');});
window.addEventListener('keydown', e=>{if(e.key==='Escape') modal.classList.remove('active');});

// Search
document.getElementById('searchInput').addEventListener('input', e=>{
  const q = e.target.value.toLowerCase();
  dashboard.innerHTML='';
  Object.values(DATASTORE).filter(c=>c.name.toLowerCase().includes(q)).forEach(createWidget);
});

// Initial load
async function init(){
  const data = await fetchAllData();
  dashboard.innerHTML='';
  data.forEach(createWidget);
  setInterval(async ()=>{
    const newData = await fetchAllData();
    dashboard.innerHTML='';
    newData.forEach(createWidget);
  }, 60000);
}
init();