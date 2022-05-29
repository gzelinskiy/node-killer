import {ShellService} from "./ShellService";
import moment = require("moment");

export class KillerService {
    private shellService: ShellService;
    private processesData: IProcessData[] = [];

    private intervalToRefresh = 30; // in seconds
    private timeoutToKill = 120;    // in seconds
    private avgUsageToKill = 90;    // in percents

    constructor() {
        this.shellService = ShellService.getInstance();
    }

    public watchProcesses(): void {
        setInterval(() => {
            const processIDs = this.shellService.showPIDs();

            this.updateProcessesData(processIDs);

            if (!processIDs.length) {
                return;
            }

            this.updateCPUUsage(processIDs);

            this.killProcesses();
        }, this.intervalToRefresh * 1000);
    }

    private updateProcessesData(actualPIDs: string[]): void {
        const processesDataUpdated: IProcessData[] = [];

        const storedPIDs = this.processesData.map((storedPIDData) => {
           return storedPIDData.pid;
        });

        actualPIDs.forEach((actualPID) => {
            if (storedPIDs.includes(actualPID)) {
                const storedProcessData = this.processesData.find((item) => {
                    return item.pid === actualPID;
                });
                processesDataUpdated.push(storedProcessData!);
            } else {
                processesDataUpdated.push({
                    pid:      actualPID,
                    cpuUsage: [],
                })
            }
        });

        this.processesData = processesDataUpdated;
    }

    private updateCPUUsage(processIDs: string[]): void {
        for (const processID of processIDs) {
            let cpuUsage: number | null = null;
            try {
                cpuUsage = this.shellService.showCPUUsageForPID(processID);
            } catch (e) {
                // do nothing
            }

            if (!cpuUsage) {
                continue;
            }

            this.processesData.forEach((item) => {
                if (item.pid === processID) {
                    item.cpuUsage.push({
                        percents: cpuUsage!,
                        date:     new Date(),
                    });
                }
            });
        }
    }

    private killProcesses(): void {
        this.processesData.forEach((processData) => {
            let avgUsage: number | null = null;
            let timeDiff: number | null = null;
            if (processData.cpuUsage.length > 0) {
                const sumUsage = processData.cpuUsage.reduce((accumulator: number, currentValue: ICpuUsage) => {
                    return accumulator + currentValue.percents;
                }, 0);

                avgUsage = sumUsage / processData.cpuUsage.length;

                const dates = processData.cpuUsage.map((item) => {
                    return moment(item.date);
                })
                const minDate = moment.min(dates);
                const maxDate = moment.max(dates);

                timeDiff = maxDate.diff(minDate, 'seconds');
            }

            if (avgUsage && timeDiff && avgUsage >= this.avgUsageToKill && timeDiff >= this.timeoutToKill) {
                this.shellService.killProcess(processData.pid);

                console.log(`PID ${processData.pid} killed`);
            }
        });
    }

}

type IProcessData = {
    pid:      string;
    cpuUsage: ICpuUsage[];
}

type ICpuUsage = {
    percents: number;
    date:     Date;
}
