import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const KST_TIMEZONE = 'Asia/Seoul';
const SLOT_INTERVAL = 30; // 30분 단위

export const TimeUtil = {
    /**
     * 현재 시간을 KST 기준으로 반환
     */
    nowKst() {
        return dayjs().tz(KST_TIMEZONE);
    },

    /**
     * 입력받은 날짜를 KST 기준 Dayjs 객체로 변환
     */
    toDayjsKst(date: string | Date | number) {
        return dayjs(date).tz(KST_TIMEZONE);
    },

    /**
     * KST 기준으로 날짜 포맷팅
     */
    formatKst(date: Date | string | number, format = 'YYYY-MM-DDTHH:mm:ss.SSSZ'): string {
        return dayjs(date).tz(KST_TIMEZONE).format(format);
    },

    startOfKstDate(date: string | Date) {
        return dayjs(date).tz(KST_TIMEZONE).startOf('day');
    },

    /**
     * DATE 컬럼에 저장할 값을 만든다.
     *
     * PostgreSQL DATE는 시간대 정보 없이 "달력 날짜"만 저장하지만,
     * JS Date를 그대로 넘기면 내부 UTC 시각 기준으로 하루가 밀릴 수 있다.
     * 예를 들어 KST 자정(2026-05-18 00:00+09:00)은 UTC로 2026-05-17 15:00:00Z라서
     * DATE 컬럼에 2026-05-17로 들어갈 수 있다.
     *
     * 이 helper는 KST 기준 달력 날짜를 먼저 YYYY-MM-DD 문자열로 고정한 뒤,
     * 같은 날짜의 UTC 자정 Date(YYYY-MM-DDT00:00:00.000Z)를 만들어 반환한다.
     * 이렇게 만든 Date를 DATE 컬럼에 넣으면 DB에는 의도한 달력 날짜 그대로 저장된다.
     */
    toUtcDateOnly(date: string | Date | number) {
        const formattedDate = dayjs(date).tz(KST_TIMEZONE).format('YYYY-MM-DD');
        return new Date(`${formattedDate}T00:00:00.000Z`);
    },

    // --- 슬롯 인덱스(0-47) 관련 로직 ---

    /**
     * "HH:mm" 문자열을 슬롯 인덱스(0~47)로 변환
     * 00:00 -> 0 / 18:00 -> 36 / 18:30 -> 37
     */
    timeToSlotIndex(timeStr: string): number {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 2 + (minutes >= 30 ? 1 : 0);
    },

    /**
     * 슬롯 인덱스(0~47)를 "HH:mm" 문자열로 변환
     * 36 -> "18:00" / 37 -> "18:30"
     */
    slotIndexToTime(index: number): string {
        const hours = Math.floor(index / 2);
        const minutes = (index % 2) * SLOT_INTERVAL;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    },

    /**
     * 입력된 시간이 30분 단위(00분 또는 30분)인지 확인
     */
    isValidThirtyMinuteStep(timeStr: string): boolean {
        const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timePattern.test(timeStr)) return false;

        const [, minutes] = timeStr.split(':').map(Number);
        return minutes % SLOT_INTERVAL === 0;
    },

    parseTimeToDate(timeStr: string): Date {
        return new Date(`1970-01-01T${timeStr}:00Z`);
    },

    /**
     * 두 시간 문자열 사이의 모든 인덱스 배열을 생성
     */
    getRangeIndices(startTime: string, endTime: string): number[] {
        const startIdx = this.timeToSlotIndex(startTime);
        const endIdx = this.timeToSlotIndex(endTime);
        const indices: number[] = [];

        for (let i = startIdx; i < endIdx; i++) {
            indices.push(i);
        }
        return indices;
    },
};
