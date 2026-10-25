import assert from "node:assert/strict";
import { test } from "node:test";
import { WorkoutApiError, type WorkoutDetail } from "../src/api/workouts.ts";
import { persistSets, finishWorkout } from "../src/features/workouts/persistence.ts";
const input=[{set_number:1,reps:8,weight:"42.5"}];
const detail:WorkoutDetail={workout_id:"w",user_id:1,performed_at:"2026-10-25T12:00:00+09:00",is_completed:false,exercises:[{workout_exercise_id:"e",exercise_id:"master",display_name:"ベンチプレス",position:1,sets:[{...input[0],workout_set_id:"s"}]}]};
const unknown=new WorkoutApiError("通信失敗",{kind:"network",writeOutcome:"unknown"});
test("lost set-write response is reconciled by one GET and never duplicated",async()=>{
 let writes=0,reads=0;
 const api={saveWorkoutSets:async()=>{writes++;throw unknown;},fetchWorkout:async()=>{reads++;return detail;},completeWorkout:async()=>detail};
 const result=await persistSets("w","e",input,api);
 assert.equal(result.sets[0].workout_set_id,"s");assert.equal(writes,1);assert.equal(reads,1);
});
test("different stored sets or failed GET cannot become a successful save",async()=>{
 for (const fetchWorkout of [async()=>({...detail,exercises:[]}),async()=>{throw Error("offline");}]) {
 const api={saveWorkoutSets:async()=>{throw unknown;},fetchWorkout,completeWorkout:async()=>detail};
 await assert.rejects(persistSets("w","e",input,api),e=>e===unknown);
 }
});
test("rejected saves do not issue a speculative GET or completion",async()=>{
 const rejected=new WorkoutApiError("入力エラー",{kind:"http",writeOutcome:"rejected",status:400});
 await assert.rejects(persistSets("w","e",input,{saveWorkoutSets:async()=>{throw rejected;},fetchWorkout:async()=>{assert.fail("no GET");},completeWorkout:async()=>{assert.fail("no PATCH");}}),e=>e===rejected);
});
test("lost completion response uses persisted GET state",async()=>{
 let writes=0;
 const api={saveWorkoutSets:async()=>({workout_exercise_id:"e",sets:detail.exercises[0].sets}),completeWorkout:async()=>{writes++;throw unknown;},fetchWorkout:async()=>({...detail,is_completed:true})};
 assert.equal((await finishWorkout("w",api)).is_completed,true);assert.equal(writes,1);
 await assert.rejects(finishWorkout("w",{...api,fetchWorkout:async()=>detail}),e=>e===unknown);
});
