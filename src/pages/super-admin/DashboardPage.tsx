import { useEffect, useState } from "react";
import {
  School,
  fetchSchools,
  approveSchool,
  suspendSchool,
  activateSchool,
  deleteSchool
} from "../../services/schools";

import { Card, StatCard } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import {
  School as SchoolIcon,
  Users,
  Calendar,
  BookOpen
} from "lucide-react";


const STATUS_STYLE:any = {

pending:"bg-amber-100 text-amber-700",
active:"bg-emerald-100 text-emerald-700",
suspended:"bg-rose-100 text-rose-700"

};



export default function DashboardPage(){


const [schools,setSchools]=useState<School[]>([]);
const [busy,setBusy]=useState<string|null>(null);



async function load(){

setSchools(await fetchSchools());

}



useEffect(()=>{

load();

},[]);



async function action(
id:string,
fn:any
){

setBusy(id);

await fn(id);

await load();

setBusy(null);

}



async function removeSchool(
id:string,
name:string
){

if(
confirm(
`Delete ${name}? This cannot be undone`
)
){

await action(id,deleteSchool);

}

}



return (

<div className="space-y-6 p-6">


<div>

<h1 className="font-display text-2xl font-bold">
Super Admin Dashboard
</h1>

<p className="text-slate-500">
Manage the entire school ERP platform
</p>

</div>



<div className="grid gap-4 md:grid-cols-4">


<StatCard
label="Total Schools"
value={schools.length}
icon={<SchoolIcon size={20}/>}
/>


<StatCard
label="Active Schools"
value={
schools.filter(
s=>s.status==="active"
).length
}
icon={<Users size={20}/>}
/>


<StatCard
label="Curriculum"
value="Managed"
icon={<BookOpen size={20}/>}
/>


<StatCard
label="Academic Sessions"
value="Configured"
icon={<Calendar size={20}/>}
/>


</div>





<Card className="overflow-x-auto">


<h2 className="font-semibold mb-4">
School Management
</h2>



<table className="w-full text-sm">

<thead>

<tr className="border-b">

<th className="p-3 text-left">
School
</th>

<th className="p-3">
Status
</th>

<th className="p-3">
Actions
</th>


</tr>

</thead>



<tbody>


{
schools.map(s=>(


<tr
key={s.id}
className="border-b"
>


<td className="p-3 font-medium">

{s.name}

</td>



<td className="p-3">

<span
className={`px-2 py-1 rounded text-xs ${STATUS_STYLE[s.status]}`}
>

{s.status}

</span>

</td>



<td className="p-3">

<div className="flex gap-2 flex-wrap">


{
s.status==="pending" &&

<Button
variant="primary"
disabled={busy===s.id}
onClick={()=>
action(
s.id,
approveSchool
)
}
>

Approve

</Button>

}




{
s.status==="active" &&

<Button
variant="secondary"
disabled={busy===s.id}
onClick={()=>
action(
s.id,
suspendSchool
)
}
>

Suspend

</Button>

}



{
s.status==="suspended" &&

<Button
variant="secondary"
disabled={busy===s.id}
onClick={()=>
action(
s.id,
activateSchool
)
}
>

Reactivate

</Button>

}



<Button
variant="danger"
disabled={busy===s.id}
onClick={()=>
removeSchool(
s.id,
s.name
)
}
>

Delete

</Button>


</div>


</td>


</tr>


))

}


</tbody>


</table>


</Card>


</div>

);


}