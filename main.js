const fs = require("fs");

function convertToSeconds(timeStr){
    let parts = timeStr.split(" ");
    let time = parts[0];
    let period = parts[1];

    let timeParts = time.split(":");
    let hours = parseInt(timeParts[0]);
    let mins = parseInt(timeParts[1]);
    let secs = parseInt(timeParts[2]);

    if(period === "pm" && hours !== 12){
        hours += 12;
    }

    if(period === "am" && hours === 12){
        hours = 0;
    }

    return hours * 3600 + mins * 60 + secs;
}

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {

    let start = convertToSeconds(startTime);
    let end = convertToSeconds(endTime);

    let result = end - start;

    if(result < 0){
        result += 24 * 3600;
    }

    let hours = Math.floor(result/3600);
    result %= 3600;
    let minutes = Math.floor(result/60);
    let seconds = result % 60;

    return `${hours}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {

    let start = convertToSeconds(startTime);
    let end = convertToSeconds(endTime);

    let eightAM = 8 * 3600;
    let tenPM = 22 * 3600;

    let idle = 0;

    if(start < eightAM){
        idle += Math.min(eightAM,end) - start;
    }

    if(end > tenPM){
        idle += end - Math.max(tenPM,start);
    }

    let hours = Math.floor(idle/3600);
    idle %= 3600;
    let minutes = Math.floor(idle/60);
    let seconds = idle % 60;

    return `${hours}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {

    function toSeconds(timeStr){
        let parts = timeStr.split(":");
        let h = parseInt(parts[0]);
        let m = parseInt(parts[1]);
        let s = parseInt(parts[2]);
        return h*3600 + m*60 + s;
    }

    let duration = toSeconds(shiftDuration);
    let idleTimeSec = toSeconds(idleTime);

    let active = duration - idleTimeSec;

    let hours = Math.floor(active/3600);
    active %= 3600;
    let minutes = Math.floor(active/60);
    let seconds = active % 60;

    return `${hours}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {

    function toSeconds(timeStr){
        let parts = timeStr.split(":");
        let h = parseInt(parts[0]);
        let m = parseInt(parts[1]);
        let s = parseInt(parts[2]);
        return h*3600 + m*60 + s;
    }

    let activeSeconds = toSeconds(activeTime);

    let quota = 8*3600 + 24*60;

    if(date >= "2025-04-10" && date <= "2025-04-30"){
        quota = 6*3600;
    }

    return activeSeconds >= quota;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {

    let data = fs.readFileSync(textFile,"utf8");
    let lines = data.trim().split("\n");

    for(let line of lines){
        let parts = line.split(",");
        let id = parts[0];
        let date = parts[2];

        if(id === shiftObj.driverID && date === shiftObj.date){
            return {};
        }
    }

    let shiftDuration = getShiftDuration(shiftObj.startTime,shiftObj.endTime);
    let idleTime = getIdleTime(shiftObj.startTime,shiftObj.endTime);
    let activeTime = getActiveTime(shiftDuration,idleTime);
    let met = metQuota(shiftObj.date,activeTime);

    let record = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: met,
        hasBonus: false
    };

    let newLine = `${record.driverID},${record.driverName},${record.date},${record.startTime},${record.endTime},${record.shiftDuration},${record.idleTime},${record.activeTime},${record.metQuota},${record.hasBonus}`;

    fs.appendFileSync(textFile,"\n" + newLine);

    return record;
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {

    let data = fs.readFileSync(textFile,"utf8");
    let lines = data.trim().split("\n");

    for(let i=0;i<lines.length;i++){

        let parts = lines[i].split(",");
        let id = parts[0];
        let recordDate = parts[2];

        if(id === driverID && recordDate === date){
            parts[9] = newValue.toString();
            lines[i] = parts.join(",");
        }
    }

    fs.writeFileSync(textFile,lines.join("\n"));
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {

    let data = fs.readFileSync(textFile,"utf8");
    let lines = data.trim().split("\n");

    let count = 0;
    let driverFound = false;

    for(let line of lines){

        let parts = line.split(",");

        if(parts.length < 10 || parts[0] === "DriverID") continue;

        let id = parts[0];
        let date = parts[2];
        let hasBonus = parts[9];

        let recordMonth = date.split("-")[1];

        if(id === driverID){
            driverFound = true;

            if((recordMonth === month || recordMonth === "0"+month) && hasBonus === "true"){
                count++;
            }
        }
    }

    if(!driverFound) return -1;

    return count;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {

    let data = fs.readFileSync(textFile,"utf8");
    let lines = data.trim().split("\n");

    let totalSeconds = 0;

    for(let line of lines){

        let parts = line.split(",");

        if(parts.length < 10 || parts[0] === "DriverID") continue;

        let id = parts[0];
        let date = parts[2];
        let activeTime = parts[7];

        let recordMonth = parseInt(date.split("-")[1]);

        if(id === driverID && recordMonth === month){

            let timeParts = activeTime.split(":");

            let h = parseInt(timeParts[0]);
            let m = parseInt(timeParts[1]);
            let s = parseInt(timeParts[2]);

            totalSeconds += h*3600 + m*60 + s;
        }
    }

    let hours = Math.floor(totalSeconds/3600);
    totalSeconds %= 3600;
    let minutes = Math.floor(totalSeconds/60);
    let seconds = totalSeconds % 60;

    return `${hours}:${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {


}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {

}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};