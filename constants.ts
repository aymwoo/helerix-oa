
import { User, UserRole, UserStatus, Project } from "./types";

export const AVATAR_ALEX = "https://lh3.googleusercontent.com/aida-public/AB6AXuDEL-M-EZkqt4C_Mgnw5OVy6H-eqZZZH9Gc_le11PKzdxO_S5t-iuxJpO-leAwsk0u1nRc59Dwik57jB28FR2sbGb9jlJPLdq7vx-5dWt6fWajACE6BZiZM0rxQrPqaT0mIT6bGVKMfaKeGjAndo3dsQpxYSnx7xVrWIC69PHdA5dAMxIXs8oJHdiHvoWHzaqnxq7FCf1dlvjnxsBv-k24Qt39k3owLSMZWg3jdT1zmVnrAXmtpJpu2IY0dTvO42_tHaVYq4LQe5zCx";
export const AVATAR_ALICE = "https://lh3.googleusercontent.com/aida-public/AB6AXuDhnaMbKcQJecisbMhQxxNVOGSVhfM6i7Wp0GP3o_eGYXons-r6G-xsrwvcRV-Eyu_rsrFumBVDwLUAcTx7KwFQPuLNwTnaC5tXFLdWPAx5jIcpTYWVRoVwdW5ZTYS2jsUQWCkABZlIdyd73bK4yN4U0_Pl2P3dTBCmmmWwlzj2mubYJSsVFHlE4X3Nqf9J-vd4BwoLlkXiP6b4oMspC03KtLmzgF-wQ2PhsmJGeun0n1i5ap3md8obfqxMKlTep9XwbUYBPnWeUdKq";
export const AVATAR_MARCUS = "https://lh3.googleusercontent.com/aida-public/AB6AXuBYXk0yUfGWBIOoaDYN5UVnAatOD8J6pGjO9470IYmnogFdaQMp04Tk2fMFAxrTe6Y2ts_9lv9MZYl8xfhuvuuS08EhxBhQrUjxZNTP9RJ9ODs_Xdkz7p8sjX4Pg8G3gts7KdvmC-guE4nb6IWIUEyOwxRaghM-_g3iGKH91Iil7mhl6ZzpSOf30siUgyQch8F53O_95Vl_taz_eXQLeXiMQi38lwXAJ8wLJjR_Fb8QlOkol8KCXDzVoUYMMyEtf_P5qyBwWcPWDBFA";
export const AVATAR_SARAH = "https://lh3.googleusercontent.com/aida-public/AB6AXuD0Dz_uJJtFa2WwOyJ2Ik94J5-1i44BDs_48y2VRt7wgIivSD6AMFzgEnEsVbUfkn6gqEfeiXT-p_MN9PfneXLwe-Yc9JIF8HENRgx5k-ILf25W4kiILOt8Hbezz3lJaQUiopNuW_sxQc5LFsAPfkUtl6LAkWyw7p_kTlZjXFsq79RXI3wcAf173iP2jqacfvXHua4A4n9RuhcqsnL8SRAL1YZgVMH3UT1fRG-obAt8PwnPHwdZhCdmK-guisFDYM2BbaNdppKePAqA";
export const AVATAR_DAVID = "https://lh3.googleusercontent.com/aida-public/AB6AXuDIpQ6oAPe6-_VoNuP8J6obTJytjXb9r3KWhRvxSx84IWxwaP2NUNqtq9Y6Tm0cvwSHxH_UIpTROya3oTMCvjgm1qmBz3juRLAwDWr9dalYRpYsh9-Ox98m55gbIyVq0p5JIm9brh8JZn6jugjKg0-eQ0wHZRdypNdpYE7zw7nsTVu5XKaNe1CSOr4m-yyMqPeuhJg2-HTaOd-_yFL2oVt43ZFEPuJMASL_idx1fJEph0B_jdL9lNEtpVI5lDWubmFNCvECqxltBwm4";
export const AVATAR_EMILY = "https://lh3.googleusercontent.com/aida-public/AB6AXuDYhZ8lqJ86JWCDvXGBCeVb8--BhIrdRFVKqHW5bKwBEqfNxs6AF0HFzTFJ_FUuXPbQ_k65TXfDqIndWFFxL5sf5QJMwTYytoicFQyL1J00D6hNeiLP6InEQ9S_UWczBiKft-MWl1VOLz2sfOzTVAu3ekkTxaztpnEhCpI4myXaUxJjDJjXtcKT-l8WnCkdnFcsXIOI_lU5-KBxMq2DZ2vq-cphYjjK41msQwBGWTfcPN6EpZKrp7D2zrKgH8AoGgihkWrQm9mvISyk";

// 使用项目根目录下的 logo.png
export const APP_LOGO = "/assets/images/logo.png";

export const MOCK_USERS: User[] = [
  {
    id: "1",
    name: "李春华",
    email: "chunhua.li@edu.com",
    roles: [UserRole.Chinese, UserRole.Art],
    department: "基础教育研究室",
    status: UserStatus.Active,
    avatarUrl: AVATAR_ALICE
  },
  {
    id: "2",
    name: "陈马克",
    email: "mark.chen@edu.com",
    roles: [UserRole.Math, UserRole.IT],
    department: "理化生教研组",
    status: UserStatus.Active,
    avatarUrl: AVATAR_MARCUS
  },
  {
    id: "3",
    name: "张莎拉",
    email: "sarah.zhang@edu.com",
    roles: [UserRole.English],
    department: "外语教研室",
    status: UserStatus.Offline,
    avatarUrl: AVATAR_SARAH
  },
  {
    id: "4",
    name: "大卫·刘",
    email: "david.liu@edu.com",
    roles: [UserRole.Physics, UserRole.Chemistry],
    department: "理化生教研组",
    status: UserStatus.Active,
    avatarUrl: AVATAR_DAVID
  },
  {
    id: "5",
    name: "王艾米",
    email: "emily.wang@edu.com",
    roles: [UserRole.History, UserRole.Politics],
    department: "政史地教研组",
    status: UserStatus.Inactive,
    avatarUrl: AVATAR_EMILY
  }
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: "101",
    name: "2024 中考命题趋势深度分析",
    deadline: "2023年12月15日",
    progress: 75,
    team: [AVATAR_ALICE, AVATAR_SARAH],
    extraTeamCount: 2,
    color: "primary"
  },
  {
    id: "102",
    name: "新课程标准(2022) 培训资源库建设",
    deadline: "2024年01月10日",
    progress: 33,
    team: [AVATAR_MARCUS],
    color: "secondary"
  },
  {
    id: "103",
    name: "跨学科项目化学习（PBL）案例集",
    deadline: "2023年11月20日",
    progress: 90,
    team: [AVATAR_DAVID, AVATAR_EMILY],
    color: "primary"
  }
];
