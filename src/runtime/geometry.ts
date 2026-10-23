type Box={width:number;height:number;matrix:DOMMatrix};

// Use transformed corners, not screen-aligned bounding rectangles, for clipping.
export function clipInspector(){
  const boxes=new Map<HTMLElement,Box>(),linear=new Map<HTMLElement,DOMMatrix>();
  function axes(el:HTMLElement):DOMMatrix{
    let result=linear.get(el);if(result)return result;
    const transform=getComputedStyle(el).transform;
    result=(el.parentElement?axes(el.parentElement):new DOMMatrix()).multiply(new DOMMatrix(transform==='none'?undefined:transform));
    linear.set(el,result);return result;
  }
  function box(el:HTMLElement):Box{
    const cached=boxes.get(el);if(cached)return cached;
    const style=getComputedStyle(el),width=parseFloat(style.width),height=parseFloat(style.height),r=el.getBoundingClientRect(),m=axes(el);
    const corners=[[0,0],[width,0],[width,height],[0,height]].map(([x,y])=>({x:m.a*x+m.c*y,y:m.b*x+m.d*y}));
    const result={width,height,matrix:new DOMMatrix([m.a,m.b,m.c,m.d,r.left-Math.min(...corners.map(p=>p.x)),r.top-Math.min(...corners.map(p=>p.y))])};
    boxes.set(el,result);return result;
  }
  return (el:HTMLElement,ancestor:HTMLElement)=>{
    const style=getComputedStyle(ancestor),cuts=(value:string)=>['hidden','clip','auto','scroll'].includes(value);
    const cutX=cuts(style.overflowX),cutY=cuts(style.overflowY);if(!cutX&&!cutY)return false;
    const child=box(el),parent=box(ancestor),relative=parent.matrix.inverse().multiply(child.matrix);
    const left=parseFloat(style.borderLeftWidth)||0,top=parseFloat(style.borderTopWidth)||0;
    const right=parent.width-(parseFloat(style.borderRightWidth)||0),bottom=parent.height-(parseFloat(style.borderBottomWidth)||0);
    // Actors expose one uniform radius and uniform borders, so the inner radius
    // is the outer radius minus the border, with CSS's size clamping applied.
    const radius=Math.max(0,Math.min(parseFloat(style.borderTopLeftRadius)||0,parent.width/2,parent.height/2)-left);
    return [[0,0],[child.width,0],[child.width,child.height],[0,child.height]].some(([x,y])=>{
      const p=relative.transformPoint({x,y}),tolerance=.5;
      if(cutX&&(p.x<left-tolerance||p.x>right+tolerance)||cutY&&(p.y<top-tolerance||p.y>bottom+tolerance))return true;
      if(!cutX||!cutY||!radius)return false;
      const cx=Math.max(left+radius,Math.min(right-radius,p.x)),cy=Math.max(top+radius,Math.min(bottom-radius,p.y));
      return Math.hypot(p.x-cx,p.y-cy)>radius+tolerance;
    });
  };
}
