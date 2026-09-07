class EvidenceRecorder extends AudioWorkletProcessor {
  constructor(){
    super();this.length=4096;this.channels=[new Float32Array(this.length),new Float32Array(this.length)];this.position=0;this.recording=true;
    this.port.onmessage=e=>{if(e.data==='stop'){this.flush();this.recording=false;this.port.postMessage({type:'done'});}};
  }
  flush(){
    if(!this.position)return;
    const left=this.channels[0].slice(0,this.position),right=this.channels[1].slice(0,this.position);
    this.port.postMessage({type:'chunk',left,right},[left.buffer,right.buffer]);this.position=0;
  }
  process(inputs){
    if(!this.recording)return true;
    const input=inputs[0];
    if(!input?.length)return true;
    for(let i=0;i<input[0].length;i++){
      this.channels[0][this.position]=input[0][i];this.channels[1][this.position]=(input[1]||input[0])[i];
      if(++this.position===this.length)this.flush();
    }
    return true;
  }
}
registerProcessor('evidence-recorder',EvidenceRecorder);
