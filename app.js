const sampleWords=["routine","thoughtful","stretching","before","checking","calendar","reliable","practice"];
let words=[...sampleWords], current=0, running=false, timer=null, playToken=0;
const $=id=>document.getElementById(id), status=$("status"), list=$("word-list");

function clampPosition(){current=Math.max(0,Math.min(current,Math.max(0,words.length-1)))}
function updateProgress(){
  clampPosition();
  $("progress").max=Math.max(0,words.length-1);
  $("progress").value=current;
  $("progress").disabled=!words.length;
  $("position").textContent=words.length?`Word ${current+1} of ${words.length}`:"No words";
}
function render(){
  updateProgress();
  list.innerHTML=words.length?words.map((word,i)=>`<span class="chip ${i===current?"active":""}" data-index="${i}"><button type="button" class="word-select" title="Start from ${word}">${word}</button><button type="button" class="remove" aria-label="Remove ${word}" title="Remove word">×</button></span>`).join(""):`<span class="empty">Upload a Word file or add a word to create your list.</span>`;
}
function pause(message="Practice paused"){
  playToken++; clearTimeout(timer); speechSynthesis.cancel(); running=false;
  $("start").textContent="▶ Resume dictation"; status.textContent=message; render();
}
function makeUtterance(word){
  const wanted=$("voice").value;
  const voices=speechSynthesis.getVoices();
  const exact=voices.find(v=>v.lang.toLowerCase()===wanted.toLowerCase());
  const english=voices.find(v=>v.lang.toLowerCase().startsWith("en-"));
  const u=new SpeechSynthesisUtterance(word); u.lang=wanted; u.rate=1;
  if(exact) u.voice=exact; else if(english) u.voice=english;
  return u;
}
function speakUtterance(u,retry=0){
  if(speechSynthesis.getVoices().length===0 && retry<10){setTimeout(()=>speakUtterance(u,retry+1),100);return}
  speechSynthesis.resume(); speechSynthesis.speak(u);
}
function speakFrom(index){
  const token=playToken; current=index; clampPosition();
  if(!words.length){pause("Add or upload words to begin.");return}
  status.textContent=`Listening ${current+1} of ${words.length}`; render();
  const u=makeUtterance(words[current]);
  const advance=()=>{if(!running||token!==playToken)return;if(current>=words.length-1){running=false;$("start").textContent="↻ Start again";status.textContent="Great work — your dictation is complete.";render();return}timer=setTimeout(()=>{if(running&&token===playToken)speakFrom(current+1)},Number($("gap").value)*1000)};
  u.onend=advance; u.onerror=advance; speakUtterance(u);
}
function startAtCurrent(){
  if(!words.length){status.textContent="Add or upload words to begin.";return}
  clearTimeout(timer); speechSynthesis.cancel(); playToken++; running=true;
  $("start").textContent="Ⅱ Pause practice"; speakFrom(current);
}

$("start").onclick=()=>running?pause():startAtCurrent();
$("preview").onclick=()=>{
  if(!words.length)return;
  const wasRunning=running; playToken++; clearTimeout(timer); speechSynthesis.cancel(); running=false;
  const u=makeUtterance(words[current]); status.textContent=`Replay: ${words[current]}`;
  u.onend=()=>{if(wasRunning){running=true;$("start").textContent="Ⅱ Pause practice";playToken++;speakFrom(current)}else $("start").textContent="▶ Resume dictation"};
  speakUtterance(u);
};
$("voice").onchange=()=>{speechSynthesis.cancel();status.textContent="Voice selected — press Replay current word to test."};
speechSynthesis.onvoiceschanged=()=>render();
$("progress").oninput=e=>{
  current=Number(e.target.value);
  $("position").textContent=`Word ${current+1} of ${words.length}`;
  status.textContent=`Release to start from position ${current+1}`;
};
$("progress").onchange=e=>{
  const target=Number(e.target.value);
  pause("Position selected"); current=target;
  status.textContent=`Ready to start at word ${current+1}`; render();
};
$("gap").oninput=e=>$("gap-value").textContent=`${e.target.value} ${e.target.value==="1"?"second":"seconds"}`;
$("clear").onclick=()=>{pause();words=[];current=0;render();status.textContent="Upload a Word file or add a word to start again"};
$("add-form").onsubmit=e=>{e.preventDefault();const input=$("new-word"),matches=input.value.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)||[];if(!matches.length){status.textContent="Please enter a valid English word.";return}pause("Word list updated");words.push(...matches);input.value="";render()};
list.onclick=e=>{
  const chip=e.target.closest(".chip");if(!chip)return;const index=Number(chip.dataset.index);
  if(e.target.closest(".remove")){const removingCurrent=index===current;pause("Word removed");words.splice(index,1);if(index<current||removingCurrent&&current>=words.length)current--;clampPosition();render();return}
  if(e.target.closest(".word-select")){pause("Position selected");current=index;status.textContent=`Ready to start at word ${current+1}`;render()}
};
$("file").onchange=async e=>{const file=e.target.files[0];if(!file)return;if(!file.name.toLowerCase().endsWith(".docx")){status.textContent="Please choose a Word .docx file.";return}try{pause("Reading your Word file…");const result=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});const all=result.value.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)||[];words=$("duplicates").checked?all:[...new Map(all.map(w=>[w.toLowerCase(),w])).values()];current=0;status.textContent=`Found ${words.length} English words in ${file.name}`;$("start").textContent="▶ Start dictation";render()}catch{status.textContent="I couldn’t read this file. Please upload a standard .docx file."}};
render();
