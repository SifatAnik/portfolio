const jokes = [
  "Why don't Airflow DAGs ever get lost? They always know their upstream and downstream.",
  "Why did the data engineer break up with the spreadsheet? Too many unresolved joins.",
  "What do you call a Spark job that won't finish? A cluster's worst nightmare.",
  "Why did the ETL pipeline go to therapy? It couldn't stop transforming its feelings.",
  "How does a data engineer apologize? 'I'm sorry, that was a schema issue, not a me issue.'",
  "Marriage is just a two-node pipeline: no upstream/downstream, only merge conflicts you both have to resolve — together, every single day."
];
let jokeIdx = 0;
function nextJoke(){
  jokeIdx = (jokeIdx + 1) % jokes.length;
  const el = document.getElementById('jokeText');
  const n = document.getElementById('jokeNum');
  if(el) el.innerHTML = '$ joke --random<br>' + jokes[jokeIdx];
  if(n) n.textContent = '#' + String(jokeIdx+1).padStart(2,'0');
}

// Theme toggle (persists across pages via localStorage is not used per Claude artifact rules,
// but this is a real static site, not a Claude artifact, so plain localStorage is fine here.)
document.addEventListener('DOMContentLoaded', function(){
  const saved = localStorage.getItem('theme');
  if(saved === 'light'){ document.body.classList.add('light'); }
  const toggle = document.getElementById('themeToggle');
  if(toggle){
    toggle.addEventListener('click', function(){
      document.body.classList.toggle('light');
      localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
    });
  }
});
