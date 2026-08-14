export default function Skeleton() {
  return (
    <div className="space-y-4 animate-in">
      <div className="card p-4 flex items-center gap-3">
        <div className="h-7 w-28 skeleton-line" />
        <div className="h-4 w-14 skeleton-line" />
        <div className="ml-auto h-4 w-28 skeleton-line hidden sm:block" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card p-5 flex justify-center"><div className="skeleton-line rounded-full h-40 w-40" /></div>
        <div className="card p-5 flex justify-center"><div className="skeleton-line rounded-full h-40 w-40" /></div>
        <div className="sm:col-span-2 lg:col-span-1 space-y-4">
          {[1,2,3].map(i => <div key={i} className="card p-4 text-center"><div className="skeleton-line h-6 w-12 mx-auto mb-2" /><div className="skeleton-line h-3 w-14 mx-auto" /></div>)}
        </div>
      </div>
      <div className="card p-5">
        <div className="skeleton-line h-4 w-24 mb-4" />
        {[1,2,3,4,5].map(i => <div key={i} className="skeleton-line h-5 mb-2" style={{width:`${35+Math.random()*45}%`}} />)}
      </div>
      <div className="card p-4 flex items-center gap-3">
        <div className="w-4 h-4 rounded-full border-2 border-[#f0eeeb] border-t-[#a09c94] animate-spin" />
        <div className="skeleton-line h-4 w-36" />
      </div>
    </div>
  );
}
