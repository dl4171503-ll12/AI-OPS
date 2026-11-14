/** 兼容旧导入；旧入学闲聊流程已下线。 */
import { Navigate } from 'react-router-dom';
export function PrincipalIntakeFlow() { return <Navigate to="/assessment" replace />; }
