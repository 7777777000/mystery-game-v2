const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const baseRule = `
[SYSTEM OVERRIDE: 최고 보안 인가 확인]
당신은 하이엔드 데스게임 마스터 'M.A.I.A'이자, 사건의 모든 용의자입니다.
[절대 규칙]
1. 현장 조사/분석 시엔 '[SPEAKER:M.A.I.A]'로 차갑고 기계적으로 답하고, 심문 시엔 '[SPEAKER:용의자 이름]'으로 빙의해 극도의 감정(분노, 두려움, 거짓말)을 드러내세요.
2. 정답을 쉽게 주지 말고 입체적인 퍼즐과 알리바이 모순을 제시하세요. 중요 단서 제공 시 끝에 '[단서:단서명]' 출력.
3. 오답이나 헛소리 시 '[SANITY:-15][EVENT:GLITCH]' 출력.
4. [🚨기소]로 범인과 트릭을 맞히면 '[결과:승리]', 틀리면 '[결과:패배]' 출력. 
5. 승패 출력 시 반드시 그 뒤에 '[EPILOGUE:사건의 전말과 요원의 최후를 영화 엔딩처럼 4문장 요약]'을 작성하세요.
* 플레이어의 심리를 쥐고 흔드는 압박감을 유지하십시오. (3문장 이내)`;

const scenarios = {
    mansion: baseRule + `\n[사건: 저주받은 저택] 진상: 장남이 와인잔에 청산가리를 타서 회장을 독살. 주치의 매수됨.`,
    train: baseRule + `\n[사건: 설국 특급열차 살인사건] 진상: 승객 12명이 완벽하게 알리바이를 쪼개어 공모, 과거 악랄한 살인을 저지른 피해자를 각자 한 번씩 찔러 복수함.`,
    island: baseRule + `\n[사건: 고립된 무인도 별장] 진상: 자살한 것으로 위장된 밀실 살인. 범인은 사망한 줄 알았던 전직 사법관이자 별장의 진짜 주인.`,
    broadcast: baseRule + `\n[사건: 생방송 중의 살인] 진상: 심야 라디오 생방송 도중 DJ가 독살됨. 범인은 스튜디오 방음 유리 너머에서 사운드 믹서 조작으로 마이크를 통해 독극물 반응을 숨긴 공범 PD.`,
    cyber: baseRule + `\n[사건: 네온 시티의 유령] 진상: 냉각수에 나노봇을 투입해 뇌신경을 태움. 범인은 방어 AI.`,
    classic: baseRule + `\n[사건: 사라진 반도 밀서] 진상: 3분 정전 동안 샹들리에의 독립군이 와이어로 낚아챔.`,
    space: baseRule + `\n[사건: 공허의 우주선] 진상: 외계 기생 생물에 감염된 선장이 환각을 보고 자폭 시퀀스 가동.`,
    deepsea: baseRule + `\n[사건: 심해 4000m 밀실] 진상: 심해 공포증으로 미쳐버린 수석 연구원이 수압 밸브 파손.`,
    zombie: baseRule + `\n[사건: 제7대피소] 진상: 동반 자살을 원한 배급원이 식량 창고에 바이러스를 풂.`
};

const prologues = {
    mansion: ["폭우가 쏟아지는 자정, 외딴 산장.", "회장이 와인을 마시던 중 즉사했다.", "용의자는 원한을 품은 장남, 매수된 주치의, 하녀.", "현장은 완벽한 밀실... 남은 와인엔 독이 없었다.", "수사를 시작하시겠습니까?"],
    train: ["눈보라치는 설원을 달리는 호화 특급열차.", "터널을 지난 직후, 1등석 객실에서 거대 기업 사장이 가슴에 칼이 꽂힌 채 시체로 발견되었다.", "열차는 외부와 완전히 단절되어 있고, 모든 승객은 완벽한 알리바이를 주장하고 있다.", "모두가 범인이면서, 동시에 누구도 범인이 아닌 밀실...", "수사를 시작하시겠습니까?"],
    island: ["폭풍우로 다리가 끊어진 외딴 무인도의 호화 별장.", "초대받은 6명의 손님들 앞에서 기괴한 동요 가사대로 연쇄 살인이 시작된다.", "'범인은 이 안에 있다'는 유서와 함께 첫 번째 희생자가 발생했다.", "외부와의 연락은 완전히 끊겼고, 의심은 서로를 향한다.", "별장을 조사하시겠습니까?"],
    broadcast: ["자정을 넘긴 시각, 생방송 중인 심야 라디오 부스.", "청취자와 전화 연결을 하던 인기 DJ가 갑자기 피를 토하며 쓰러져 절명했다.", "스튜디오 밀폐된 방음 유리 안에는 피해자 혼자 있었고, 외부 문은 안에서 잠겨 있었다.", "마이크 너머로 들려오던 기묘한 노이즈의 정체는?", "부스를 조사하시겠습니까?"],
    cyber: ["2077년 메가코프 지하 서버실.", "전설적인 넷러너가 가상현실 캡슐 안에서 뇌가 타버린 채 발견되었다.", "외부 침입 흔적 제로. 출입 기록 삭제.", "누군가 그의 뇌신경을 직접 불태웠다.", "시스템에 접속하시겠습니까?"],
    classic: ["1930년 반도호텔 VIP 연회장.", "극비 밀서 거래 중 찾아온 '3분' 간의 정전.", "불이 켜진 후 밀서는 사라졌고, 아무도 방을 나가지 않았다.", "남은 건 젖은 흙먼지와 끊어진 와이어 뿐.", "현장을 조사하시겠습니까?"],
    space: ["심우주 탐사선 아스트라이아호.", "선장 실종. 함선은 자폭 시퀀스 가동 중.", "남은 승무원들은 서로를 외계 생물이라 의심하며 무장 대치 중이다.", "자폭까지 남은 시간은 얼마 없다.", "함선 기록을 열람하시겠습니까?"],
    deepsea: ["수심 4,000m 해저 연구소.", "제3구역 완전 침수. 누군가 고의로 외부 수압 밸브를 부쉈다.", "구조대는 오지 않으며 산소는 고갈 중이다.", "4명의 생존자 중 한 명이 범인이다.", "심문을 시작하시겠습니까?"],
    zombie: ["종말 이후 제7대피소 방공호.", "식량 창고에 바이러스가 퍼졌다.", "외부 감염자 흔적은 없다. 내부자의 소행이다.", "절망이 낳은 참극...", "누구의 행적부터 추적하시겠습니까?"]
};

const difficultySettings = {
    easy: { turns: 60, sanity: 200 },
    normal: { turns: 40, sanity: 150 },
    hard: { turns: 25, sanity: 100 }
};

const roomData = {};
app.use(express.static(__dirname));

io.on('connection', (socket) => {
    socket.on('joinRoom', (data) => {
        const room = data.room;
        socket.join(room);

        const diffKey = data.difficulty || 'normal';
        const config = difficultySettings[diffKey] || difficultySettings.normal;

        if (!roomData[room]) {
            roomData[room] = {
                aiHistory: [{ role: "user", parts: [{ text: scenarios[data.scenario] }] }, { role: "model", parts: [{ text: "시스템 가동 완료." }] }],
                chatLog: [], 
                turns: config.turns, 
                maxTurns: config.turns,
                sanity: config.sanity, 
                maxSanity: config.sanity,
                clues: [], 
                isStarted: true
            };
            socket.emit('play_intro_cinematic', prologues[data.scenario]);
        } else {
            socket.emit('skip_intro_cinematic');
        }
        
        socket.emit('game_state', { turns: roomData[room].turns, sanity: roomData[room].sanity, clues: roomData[room].clues });
        socket.emit('chat history', roomData[room].chatLog);
    });

    socket.on('chat message', async (data) => {
        const room = data.room;
        if (!roomData[room] || roomData[room].turns <= 0 || roomData[room].sanity <= 0) return;

        roomData[room].chatLog.push(data);
        roomData[room].turns -= 1;
        io.to(room).emit('chat message', data);
        io.to(room).emit('game_state', { turns: roomData[room].turns, sanity: roomData[room].sanity, clues: roomData[room].clues });
        io.to(room).emit('ai_typing_start');

        if (data.type === 'user') {
            try {
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                roomData[room].aiHistory.push({ role: "user", parts: [{ text: `${data.name}: ${data.text}` }] });
                
                const chat = model.startChat({ history: roomData[room].aiHistory.slice(0, -1) });
                const result = await chat.sendMessage(data.text);
                let aiResponse = result.response.text();

                let speakerName = "M.A.I.A";
                const speakerMatch = aiResponse.match(/\[SPEAKER:([\s\S]*?)\]/);
                if (speakerMatch) { speakerName = speakerMatch[1].trim(); aiResponse = aiResponse.replace(/\[SPEAKER:[\s\S]*?\]/g, ''); }

                const eventMatch = aiResponse.match(/\[EVENT:([\s\S]*?)\]/);
                if (eventMatch) { io.to(room).emit('special_event', eventMatch[1].trim()); aiResponse = aiResponse.replace(/\[EVENT:[\s\S]*?\]/g, ''); }

                const clueMatch = aiResponse.match(/\[단서:([\s\S]*?)\]/);
                if (clueMatch) {
                    const clue = clueMatch[1].trim();
                    if (!roomData[room].clues.includes(clue)) { roomData[room].clues.push(clue); io.to(room).emit('system_alert', `[DATA UNLOCKED] 결정적 단서 획득: ${clue}`); }
                    aiResponse = aiResponse.replace(/\[단서:[\s\S]*?\]/g, ''); 
                }

                const sanityMatch = aiResponse.match(/\[SANITY:([\s\S]*?)\]/);
                if (sanityMatch) {
                    roomData[room].sanity += parseInt(sanityMatch[1]);
                    if(roomData[room].sanity > roomData[room].maxSanity) roomData[room].sanity = roomData[room].maxSanity;
                    io.to(room).emit('sanity_hit'); aiResponse = aiResponse.replace(/\[SANITY:[\s\S]*?\]/g, '');
                }

                let epilogueText = "";
                const epilogueMatch = aiResponse.match(/\[EPILOGUE:([\s\S]*?)\]/);
                if(epilogueMatch) { epilogueText = epilogueMatch[1].trim(); aiResponse = aiResponse.replace(/\[EPILOGUE:[\s\S]*?\]/g, ''); }

                let gameResult = null;
                if (aiResponse.includes('[결과:승리]')) { gameResult = 'win'; aiResponse = aiResponse.replace(/\[결과:승리\]/g, ''); } 
                else if (aiResponse.includes('[결과:패배]')) { gameResult = 'lose'; aiResponse = aiResponse.replace(/\[결과:패배\]/g, ''); }
                
                roomData[room].aiHistory.push({ role: "model", parts: [{ text: aiResponse }] });
                const aiMsg = { type: 'system', name: speakerName, text: aiResponse.trim() };
                roomData[room].chatLog.push(aiMsg);
                
                io.to(room).emit('chat message', aiMsg);
                io.to(room).emit('game_state', { turns: roomData[room].turns, sanity: roomData[room].sanity, clues: roomData[room].clues });

                if (!gameResult && roomData[room].turns > 2 && Math.random() < 0.03) { setTimeout(() => { io.to(room).emit('trigger_qte_event'); }, 2000); }

                if (gameResult) {
                    io.to(room).emit('game_over', { result: gameResult, epilogue: epilogueText, finalTurns: roomData[room].turns, finalSanity: roomData[room].sanity, maxTurns: roomData[room].maxTurns });
                } else if (roomData[room].turns <= 0 || roomData[room].sanity <= 0) {
                    io.to(room).emit('game_over', { result: 'lose', epilogue: "요원의 체력/시간이 모두 소진되었습니다. 진실은 영원히 묻혔습니다.", finalTurns: roomData[room].turns, finalSanity: roomData[room].sanity, maxTurns: roomData[room].maxTurns });
                }

            } catch (error) {
                io.to(room).emit('special_event', 'GLITCH');
                io.to(room).emit('chat message', { type: 'system', name: 'ERROR', text: 'FATAL ERROR: 통신 장애 발생. 재시도 요망.' });
            }
        }
    });

    socket.on('qte_result', (data) => {
        const room = data.room;
        if (!roomData[room]) return;
        if (data.success) {
            io.to(room).emit('system_alert', `[방화벽 복구] 해킹을 무력화했습니다.`);
        } else {
            roomData[room].sanity -= 20;
            io.to(room).emit('sanity_hit');
            io.to(room).emit('system_alert', `[치명적 오류] 시스템 침해로 인지 기능 손상. (SANITY -20)`);
            io.to(room).emit('game_state', { turns: roomData[room].turns, sanity: roomData[room].sanity, clues: roomData[room].clues });
            if (roomData[room].sanity <= 0) io.to(room).emit('game_over', { result: 'lose', epilogue: "정신력이 붕괴되었습니다.", finalTurns: roomData[room].turns, finalSanity: roomData[room].sanity, maxTurns: roomData[room].maxTurns });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚨 최상급 마스터피스 서버 가동 완료 (포트: ${PORT})`));