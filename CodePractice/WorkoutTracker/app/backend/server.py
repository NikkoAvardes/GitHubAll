from fastapi import FastAPI, APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timedelta
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'workout_app')]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-super-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Create the main app
app = FastAPI(title="Workout Tracker API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class Exercise(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    muscle_group: str


class ProgramExercise(BaseModel):
    exercise_id: str
    exercise_name: str
    muscle_group: str
    target_sets: int = 3


class WorkoutProgramCreate(BaseModel):
    name: str
    exercises: List[ProgramExercise]


class WorkoutProgram(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    exercises: List[ProgramExercise]
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SessionSetCreate(BaseModel):
    exercise_id: str
    weight: float
    reps: int

class SessionSet(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    user_id: str
    exercise_id: str
    weight: float
    reps: int
    created_at: datetime = Field(default_factory=datetime.utcnow)

class WorkoutSessionCreate(BaseModel):
    program_id: str
    program_name: str

class WorkoutSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    program_id: str
    program_name: str
    start_time: datetime = Field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    is_active: bool = True

class LastSetResponse(BaseModel):
    exercise_id: str
    weight: float
    reps: int

class UserSearchResponse(BaseModel):
    id: str
    username: str
    email: str
    has_pending_request: bool = False
    is_friend: bool = False

class FriendRequestResponse(BaseModel):
    id: str
    from_user_id: str
    from_username: str
    to_user_id: str
    status: str  # "pending", "accepted"
    created_at: datetime


class SessionExerciseDetails(BaseModel):
    exercise_id: str
    exercise_name: str
    muscle_group: Optional[str] = None
    total_sets: int
    sets: List[SessionSet]


class SessionDetailsResponse(BaseModel):
    session: WorkoutSession
    exercises: List[SessionExerciseDetails]


# ==================== WEBSOCKET MANAGER ====================


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.setdefault(user_id, []).append(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        conns = self.active_connections.get(user_id)
        if not conns:
            return
        if websocket in conns:
            conns.remove(websocket)
        if not conns:
            self.active_connections.pop(user_id, None)

    async def broadcast_to_users(self, user_ids: List[str], message: Dict) -> None:
        for uid in user_ids:
            connections = self.active_connections.get(uid, [])
            for ws in list(connections):
                try:
                    await ws.send_json(message)
                except Exception:
                    # При ошибке отправки отключаем сокет
                    self.disconnect(uid, ws)


manager = ConnectionManager()

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== SEED EXERCISES ====================

INITIAL_EXERCISES = [
    # Chest
    {"id": str(uuid.uuid4()), "name": "Жим штанги лёжа", "muscle_group": "Грудь"},
    {"id": str(uuid.uuid4()), "name": "Жим гантелей лёжа", "muscle_group": "Грудь"},
    {"id": str(uuid.uuid4()), "name": "Разводка гантелей", "muscle_group": "Грудь"},
    {"id": str(uuid.uuid4()), "name": "Отжимания от пола", "muscle_group": "Грудь"},
    {"id": str(uuid.uuid4()), "name": "Жим в тренажёре", "muscle_group": "Грудь"},
    # Back
    {"id": str(uuid.uuid4()), "name": "Подтягивания", "muscle_group": "Спина"},
    {"id": str(uuid.uuid4()), "name": "Тяга штанги в наклоне", "muscle_group": "Спина"},
    {"id": str(uuid.uuid4()), "name": "Тяга гантели в наклоне", "muscle_group": "Спина"},
    {"id": str(uuid.uuid4()), "name": "Тяга верхнего блока", "muscle_group": "Спина"},
    {"id": str(uuid.uuid4()), "name": "Тяга нижнего блока", "muscle_group": "Спина"},
    # Legs
    {"id": str(uuid.uuid4()), "name": "Приседания со штангой", "muscle_group": "Ноги"},
    {"id": str(uuid.uuid4()), "name": "Жим ногами", "muscle_group": "Ноги"},
    {"id": str(uuid.uuid4()), "name": "Выпады с гантелями", "muscle_group": "Ноги"},
    {"id": str(uuid.uuid4()), "name": "Разгибание ног", "muscle_group": "Ноги"},
    {"id": str(uuid.uuid4()), "name": "Сгибание ног", "muscle_group": "Ноги"},
    {"id": str(uuid.uuid4()), "name": "Подъём на носки", "muscle_group": "Ноги"},
    # Shoulders
    {"id": str(uuid.uuid4()), "name": "Жим штанги стоя", "muscle_group": "Плечи"},
    {"id": str(uuid.uuid4()), "name": "Жим гантелей сидя", "muscle_group": "Плечи"},
    {"id": str(uuid.uuid4()), "name": "Разведение гантелей в стороны", "muscle_group": "Плечи"},
    {"id": str(uuid.uuid4()), "name": "Тяга штанги к подбородку", "muscle_group": "Плечи"},
    # Arms
    {"id": str(uuid.uuid4()), "name": "Подъём штанги на бицепс", "muscle_group": "Руки"},
    {"id": str(uuid.uuid4()), "name": "Подъём гантелей на бицепс", "muscle_group": "Руки"},
    {"id": str(uuid.uuid4()), "name": "Молотки", "muscle_group": "Руки"},
    {"id": str(uuid.uuid4()), "name": "Французский жим", "muscle_group": "Руки"},
    {"id": str(uuid.uuid4()), "name": "Разгибание на трицепс", "muscle_group": "Руки"},
    {"id": str(uuid.uuid4()), "name": "Отжимания на брусьях", "muscle_group": "Руки"},
    # Core
    {"id": str(uuid.uuid4()), "name": "Скручивания", "muscle_group": "Пресс"},
    {"id": str(uuid.uuid4()), "name": "Планка", "muscle_group": "Пресс"},
    {"id": str(uuid.uuid4()), "name": "Подъём ног в висе", "muscle_group": "Пресс"},
]

@app.on_event("startup")
async def seed_exercises():
    count = await db.exercises.count_documents({})
    if count == 0:
        await db.exercises.insert_many(INITIAL_EXERCISES)
        logger.info(f"Seeded {len(INITIAL_EXERCISES)} exercises")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": user_data.email.lower(),
        "username": user_data.username,
        "password_hash": hash_password(user_data.password),
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(user)
    
    token = create_token(user_id)
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user["email"],
            username=user["username"],
            created_at=user["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email.lower()})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user["id"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            username=user["username"],
            created_at=user["created_at"]
        )
    )


@api_router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket для пуш-уведомлений (например, обновления друзей/заявок).

    Ожидает query-параметр ?token=JWT и использует его, чтобы определить user_id.
    """
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            await websocket.close(code=1008)
            return
    except jwt.InvalidTokenError:
        await websocket.close(code=1008)
        return

    await manager.connect(user_id, websocket)
    try:
        # Держим соединение открытым, читаем входящие сообщения (если будут)
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        username=current_user["username"],
        created_at=current_user["created_at"]
    )

# ==================== EXERCISE ROUTES ====================

@api_router.get("/exercises", response_model=List[Exercise])
async def get_exercises():
    exercises = await db.exercises.find().to_list(100)
    return [Exercise(**ex) for ex in exercises]

@api_router.get("/exercises/groups")
async def get_muscle_groups():
    exercises = await db.exercises.find().to_list(100)
    groups = list(set(ex["muscle_group"] for ex in exercises))
    return {"groups": sorted(groups)}

# ==================== PROGRAM ROUTES ====================

@api_router.get("/programs", response_model=List[WorkoutProgram])
async def get_programs(current_user: dict = Depends(get_current_user)):
    programs = await db.workout_programs.find({"user_id": current_user["id"]}).to_list(100)
    return [WorkoutProgram(**p) for p in programs]

@api_router.post("/programs", response_model=WorkoutProgram)
async def create_program(program_data: WorkoutProgramCreate, current_user: dict = Depends(get_current_user)):
    program = WorkoutProgram(
        user_id=current_user["id"],
        name=program_data.name,
        exercises=program_data.exercises
    )
    await db.workout_programs.insert_one(program.dict())
    return program

@api_router.delete("/programs/{program_id}")
async def delete_program(program_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.workout_programs.delete_one({"id": program_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Program not found")
    return {"message": "Program deleted"}

# ==================== WORKOUT SESSION ROUTES ====================

@api_router.post("/sessions/start", response_model=WorkoutSession)
async def start_session(session_data: WorkoutSessionCreate, current_user: dict = Depends(get_current_user)):
    # Check if there's an active session
    active = await db.workout_sessions.find_one({"user_id": current_user["id"], "is_active": True})
    if active:
        raise HTTPException(status_code=400, detail="You already have an active workout session")
    
    session = WorkoutSession(
        user_id=current_user["id"],
        program_id=session_data.program_id,
        program_name=session_data.program_name
    )
    await db.workout_sessions.insert_one(session.dict())
    return session

@api_router.get("/sessions/active", response_model=Optional[WorkoutSession])
async def get_active_session(current_user: dict = Depends(get_current_user)):
    session = await db.workout_sessions.find_one({"user_id": current_user["id"], "is_active": True})
    if session:
        return WorkoutSession(**session)
    return None

@api_router.post("/sessions/{session_id}/finish", response_model=WorkoutSession)
async def finish_session(session_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.workout_sessions.find_one_and_update(
        {"id": session_id, "user_id": current_user["id"], "is_active": True},
        {"$set": {"is_active": False, "end_time": datetime.utcnow()}},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Active session not found")
    return WorkoutSession(**result)

@api_router.get("/sessions/history", response_model=List[WorkoutSession])
async def get_session_history(current_user: dict = Depends(get_current_user)):
    sessions = await db.workout_sessions.find(
        {"user_id": current_user["id"], "is_active": False}
    ).sort("end_time", -1).to_list(50)
    return [WorkoutSession(**s) for s in sessions]


@api_router.get("/sessions/{session_id}/details", response_model=SessionDetailsResponse)
async def get_session_details(session_id: str, current_user: dict = Depends(get_current_user)):
    """Подробная информация по завершённой тренировке: упражнения и подходы."""
    session_doc = await db.workout_sessions.find_one(
        {"id": session_id, "user_id": current_user["id"], "is_active": False}
    )
    if not session_doc:
        raise HTTPException(status_code=404, detail="Session not found")

    # Все подходы этой сессии
    sets_docs = await db.session_sets.find(
        {"session_id": session_id, "user_id": current_user["id"]}
    ).to_list(500)

    # Карта упражнений из программы по id
    exercise_meta: Dict[str, Dict[str, Optional[str]]] = {}
    program = await db.workout_programs.find_one(
        {"id": session_doc["program_id"], "user_id": current_user["id"]}
    )
    if program:
        for ex in program.get("exercises", []):
            exercise_meta[ex["exercise_id"]] = {
                "name": ex.get("exercise_name"),
                "muscle_group": ex.get("muscle_group"),
            }

    # Если по какой-то причине упражнение не найдено в программе,
    # пробуем достать его из общей коллекции exercises
    missing_ids = {
        s["exercise_id"]
        for s in sets_docs
        if s["exercise_id"] not in exercise_meta
    }
    if missing_ids:
        exercises = await db.exercises.find({"id": {"$in": list(missing_ids)}}).to_list(200)
        for ex in exercises:
            exercise_meta[ex["id"]] = {
                "name": ex.get("name"),
                "muscle_group": ex.get("muscle_group"),
            }

    # Группируем подходы по exercise_id
    grouped: Dict[str, List[SessionSet]] = {}
    for s in sets_docs:
        sess_set = SessionSet(**s)
        grouped.setdefault(sess_set.exercise_id, []).append(sess_set)

    exercises_details: List[SessionExerciseDetails] = []
    for ex_id, sets in grouped.items():
        meta = exercise_meta.get(ex_id, {})
        exercises_details.append(
            SessionExerciseDetails(
                exercise_id=ex_id,
                exercise_name=meta.get("name") or "Неизвестное упражнение",
                muscle_group=meta.get("muscle_group"),
                total_sets=len(sets),
                sets=sets,
            )
        )

    return SessionDetailsResponse(
        session=WorkoutSession(**session_doc),
        exercises=exercises_details,
    )

# ==================== SESSION SETS ROUTES ====================

@api_router.post("/sessions/{session_id}/sets", response_model=SessionSet)
async def add_set(session_id: str, set_data: SessionSetCreate, current_user: dict = Depends(get_current_user)):
    # Verify session belongs to user and is active
    session = await db.workout_sessions.find_one({"id": session_id, "user_id": current_user["id"], "is_active": True})
    if not session:
        raise HTTPException(status_code=404, detail="Active session not found")
    
    set_record = SessionSet(
        session_id=session_id,
        user_id=current_user["id"],
        exercise_id=set_data.exercise_id,
        weight=set_data.weight,
        reps=set_data.reps
    )
    await db.session_sets.insert_one(set_record.dict())
    return set_record

@api_router.get("/sessions/{session_id}/sets", response_model=List[SessionSet])
async def get_session_sets(session_id: str, current_user: dict = Depends(get_current_user)):
    sets = await db.session_sets.find({"session_id": session_id, "user_id": current_user["id"]}).to_list(200)
    return [SessionSet(**s) for s in sets]

@api_router.delete("/sets/{set_id}")
async def delete_set(set_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.session_sets.delete_one({"id": set_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Set not found")
    return {"message": "Set deleted"}

# ==================== SMART MEMORY - LAST WEIGHT/REPS ====================

@api_router.get("/exercises/{exercise_id}/last-set", response_model=Optional[LastSetResponse])
async def get_last_set(exercise_id: str, current_user: dict = Depends(get_current_user)):
    """Get the last weight and reps for a specific exercise - Smart Memory feature"""
    last_set = await db.session_sets.find_one(
        {"user_id": current_user["id"], "exercise_id": exercise_id},
        sort=[("created_at", -1)]
    )
    if last_set:
        return LastSetResponse(
            exercise_id=exercise_id,
            weight=last_set["weight"],
            reps=last_set["reps"]
        )
    return None

@api_router.get("/exercises/last-sets")
async def get_all_last_sets(current_user: dict = Depends(get_current_user)):
    """Get last weight/reps for all exercises user has done"""
    pipeline = [
        {"$match": {"user_id": current_user["id"]}},
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id": "$exercise_id",
            "weight": {"$first": "$weight"},
            "reps": {"$first": "$reps"},
            "created_at": {"$first": "$created_at"}
        }}
    ]
    results = await db.session_sets.aggregate(pipeline).to_list(100)
    return {r["_id"]: {"weight": r["weight"], "reps": r["reps"]} for r in results}

# ==================== STATS ====================

@api_router.get("/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    total_sessions = await db.workout_sessions.count_documents({"user_id": current_user["id"], "is_active": False})
    total_sets = await db.session_sets.count_documents({"user_id": current_user["id"]})
    
    # Total weight lifted
    pipeline = [
        {"$match": {"user_id": current_user["id"]}},
        {"$group": {"_id": None, "total": {"$sum": {"$multiply": ["$weight", "$reps"]}}}}
    ]
    weight_result = await db.session_sets.aggregate(pipeline).to_list(1)
    total_weight = weight_result[0]["total"] if weight_result else 0
    
    return {
        "total_sessions": total_sessions,
        "total_sets": total_sets,
        "total_weight_lifted": round(total_weight, 1)
    }

# ==================== SEARCH USERS ====================

@api_router.get("/users/search", response_model=List[UserSearchResponse])
async def search_users(query: str, current_user: dict = Depends(get_current_user)):
    if len(query) < 3:
        return []

    # Ищем всех, кроме себя, по совпадению в username или email
    search_criteria = {
        "id": {"$ne": current_user["id"]},
        "$or": [
            {"username": {"$regex": query, "$options": "i"}},
            {"email": {"$regex": query, "$options": "i"}},
        ],
    }

    users = await db.users.find(search_criteria).to_list(20)

    # Собираем id пользователей, которым уже отправлены pending-заявки
    pending_requests = await db.friend_requests.find(
        {"from_user_id": current_user["id"], "status": "pending"}
    ).to_list(100)
    pending_to_ids = {r["to_user_id"] for r in pending_requests}

    # Собираем id уже подтверждённых друзей
    accepted_requests = await db.friend_requests.find(
        {
            "status": "accepted",
            "$or": [
                {"from_user_id": current_user["id"]},
                {"to_user_id": current_user["id"]},
            ],
        }
    ).to_list(200)
    friend_ids: set[str] = set()
    for r in accepted_requests:
        if r["from_user_id"] == current_user["id"]:
            friend_ids.add(r["to_user_id"])
        else:
            friend_ids.add(r["from_user_id"])

    return [
        UserSearchResponse(
            id=u["id"],
            username=u["username"],
            email=u["email"],
            has_pending_request=u["id"] in pending_to_ids,
            is_friend=u["id"] in friend_ids,
        )
        for u in users
    ]

# ==================== FRIEND REQUESTS ====================

@api_router.post("/friends/request/{friend_id}")
async def send_friend_request(friend_id: str, current_user: dict = Depends(get_current_user)):
    # Нельзя отправить заявку самому себе
    if friend_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Нельзя добавить себя в друзья")

    # Проверяем, нет ли уже активной (pending) заявки от текущего пользователя
    existing_pending = await db.friend_requests.find_one(
        {
            "from_user_id": current_user["id"],
            "to_user_id": friend_id,
            "status": "pending",
        }
    )
    if existing_pending:
        raise HTTPException(status_code=400, detail="Заявка уже отправлена")

    # Проверяем, не являетесь ли вы уже друзьями (есть accepted-заявка в любую сторону)
    existing_friend = await db.friend_requests.find_one(
        {
            "status": "accepted",
            "$or": [
                {"from_user_id": current_user["id"], "to_user_id": friend_id},
                {"from_user_id": friend_id, "to_user_id": current_user["id"]},
            ],
        }
    )
    if existing_friend:
        raise HTTPException(status_code=400, detail="Пользователь уже у вас в друзьях")

    request = {
        "id": str(uuid.uuid4()),
        "from_user_id": current_user["id"],
        "from_username": current_user["username"],
        "to_user_id": friend_id,
        "status": "pending",
        "created_at": datetime.utcnow(),
    }
    await db.friend_requests.insert_one(request)
    # Уведомляем отправителя и получателя о том, что список заявок изменился
    await manager.broadcast_to_users(
        [current_user["id"], friend_id],
        {"type": "friends_update"},
    )
    return {"message": "Заявка отправлена"}


@api_router.get("/friends/requests/incoming", response_model=List[FriendRequestResponse])
async def get_incoming_requests(current_user: dict = Depends(get_current_user)):
    requests = await db.friend_requests.find(
        {"to_user_id": current_user["id"], "status": "pending"}
    ).to_list(50)
    return [FriendRequestResponse(**r) for r in requests]


@api_router.get("/friends/requests/outgoing", response_model=List[UserSearchResponse])
async def get_outgoing_requests(current_user: dict = Depends(get_current_user)):
  """Список пользователей, которым текущий пользователь отправил заявки и они в статусе pending."""
  pending = await db.friend_requests.find(
      {"from_user_id": current_user["id"], "status": "pending"}
  ).to_list(100)

  if not pending:
      return []

  to_ids = {r["to_user_id"] for r in pending}
  users = await db.users.find({"id": {"$in": list(to_ids)}}).to_list(200)

  return [
      UserSearchResponse(
          id=u["id"],
          username=u["username"],
          email=u["email"],
          has_pending_request=True,
          is_friend=False,
      )
      for u in users
  ]


@api_router.get("/friends", response_model=List[UserSearchResponse])
async def get_friends(current_user: dict = Depends(get_current_user)):
    """Список друзей текущего пользователя на основе принятых заявок."""
    accepted = await db.friend_requests.find(
        {
            "status": "accepted",
            "$or": [
                {"from_user_id": current_user["id"]},
                {"to_user_id": current_user["id"]},
            ],
        }
    ).to_list(200)

    if not accepted:
        return []

    friend_ids = set()
    for r in accepted:
        if r["from_user_id"] == current_user["id"]:
            friend_ids.add(r["to_user_id"])
        else:
            friend_ids.add(r["from_user_id"])

    users = await db.users.find({"id": {"$in": list(friend_ids)}}).to_list(200)
    return [
        UserSearchResponse(
            id=u["id"],
            username=u["username"],
            email=u["email"],
            has_pending_request=False,
            is_friend=True,
        )
        for u in users
    ]


@api_router.post("/friends/requests/{request_id}/accept")
async def accept_friend_request(request_id: str, current_user: dict = Depends(get_current_user)):
    """Принять входящую заявку в друзья."""
    # Ищем pending-заявку, адресованную текущему пользователю
    request_doc = await db.friend_requests.find_one({
        "id": request_id,
        "to_user_id": current_user["id"],
        "status": "pending",
    })
    if not request_doc:
        raise HTTPException(status_code=404, detail="Заявка не найдена или уже обработана")

    # Обновляем статус заявки на accepted
    await db.friend_requests.update_one({"id": request_id}, {"$set": {"status": "accepted"}})

    # Уведомляем обе стороны, что список друзей/заявок изменился
    await manager.broadcast_to_users(
        [request_doc["from_user_id"], request_doc["to_user_id"]],
        {"type": "friends_update"},
    )

    return {"message": "Заявка принята"}


@api_router.post("/friends/requests/{request_id}/decline")
async def decline_friend_request(request_id: str, current_user: dict = Depends(get_current_user)):
    """Отклонить входящую заявку в друзья."""
    request_doc = await db.friend_requests.find_one({
        "id": request_id,
        "to_user_id": current_user["id"],
        "status": "pending",
    })
    if not request_doc:
        raise HTTPException(status_code=404, detail="Заявка не найдена или уже обработана")

    await db.friend_requests.update_one({"id": request_id}, {"$set": {"status": "declined"}})

    # Уведомляем обе стороны, что список заявок изменился
    await manager.broadcast_to_users(
        [request_doc["from_user_id"], request_doc["to_user_id"]],
        {"type": "friends_update"},
    )

    return {"message": "Заявка отклонена"}


@api_router.delete("/friends/{friend_id}")
async def delete_friend(friend_id: str, current_user: dict = Depends(get_current_user)):
    """Удалить друга (раздружиться)."""
    if friend_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Нельзя удалить себя")

    result = await db.friend_requests.update_many(
        {
            "status": "accepted",
            "$or": [
                {"from_user_id": current_user["id"], "to_user_id": friend_id},
                {"from_user_id": friend_id, "to_user_id": current_user["id"]},
            ],
        },
        {"$set": {"status": "removed"}},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Друг не найден")

    # Уведомляем обе стороны, что список друзей изменился
    await manager.broadcast_to_users(
        [current_user["id"], friend_id],
        {"type": "friends_update"},
    )

    return {"message": "Друг удалён"}

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "Workout Tracker API", "status": "running"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)