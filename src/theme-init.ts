const e = localStorage.getItem('super-agents-theme');
if (e === 'dark' || (!e && matchMedia('(prefers-color-scheme:dark)').matches)) {
  document.documentElement.classList.add('dark');
}
