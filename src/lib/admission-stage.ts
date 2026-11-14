import { admissionTasks, nextTaskIndex, type AdmissionState } from './admission';
export function admissionComplete(a:AdmissionState|null|undefined){return Boolean(a?.bankVersion===3&&a.completedAt&&nextTaskIndex(admissionTasks(a.gradeYear),a.answers)===-1);}
export function studentStage(s:{admission?:AdmissionState|null;schoolSetupCompletedAt?:string}){return !admissionComplete(s.admission)?'assessment':!s.schoolSetupCompletedAt?'setup':'campus';}
