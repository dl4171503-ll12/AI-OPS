import {ScheduleReminder} from './ScheduleReminder';
import {OpsArchiveAgent} from './OpsArchive';
import {GuardianCampusBoundary} from './GuardianConnection';
// 此模块只由完成入学流程后的校园布局惰性加载。
export default function CampusRuntime({children}:{children:React.ReactNode}){return <GuardianCampusBoundary><ScheduleReminder/><OpsArchiveAgent/>{children}</GuardianCampusBoundary>;}
