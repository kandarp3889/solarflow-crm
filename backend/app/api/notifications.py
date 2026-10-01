import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.models import Notification, User, Company
from app.schemas.schemas import NotificationResponse
from app.api.deps import get_current_user, get_current_company
from app.security import decode_access_token
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.websocket("/ws")
async def websocket_notifications(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Real-time WebSocket endpoint for instant in-app notification streaming.
    Authenticates via query parameter `?token=<jwt>` or initial auth JSON payload.
    """
    authenticated_user = None

    if token:
        payload = decode_access_token(token)
        if payload and payload.get("sub"):
            try:
                user_id = int(payload.get("sub"))
                authenticated_user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
            except (ValueError, TypeError):
                pass

    if not authenticated_user:
        await websocket.accept()
        try:
            # Allow client to send authentication handshake within 5 seconds
            auth_msg = await asyncio.wait_for(websocket.receive_json(), timeout=5.0)
            if auth_msg.get("type") == "auth" and auth_msg.get("token"):
                payload = decode_access_token(auth_msg["token"])
                if payload and payload.get("sub"):
                    user_id = int(payload.get("sub"))
                    authenticated_user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
        except Exception:
            pass

        if not authenticated_user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    else:
        await websocket.accept()

    # Register active event loop with connection manager
    try:
        loop = asyncio.get_running_loop()
        ws_manager.set_loop(loop)
    except RuntimeError:
        pass

    if authenticated_user.id not in ws_manager.active_connections:
        ws_manager.active_connections[authenticated_user.id] = set()
    ws_manager.active_connections[authenticated_user.id].add(websocket)

    try:
        # Send initial confirmation handshake
        await websocket.send_json({
            "type": "connected",
            "user_id": authenticated_user.id,
            "message": "Connected to real-time notification stream"
        })
        while True:
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(authenticated_user.id, websocket)
    except Exception:
        ws_manager.disconnect(authenticated_user.id, websocket)

@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    notifs = db.query(Notification).filter(
        Notification.company_id == company.id,
        Notification.user_id == current_user.id
    ).order_by(desc(Notification.created_at)).limit(50).all()
    return notifs

@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.company_id == company.id,
        Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}

@router.post("/read-all")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    db.query(Notification).filter(
        Notification.company_id == company.id,
        Notification.user_id == current_user.id
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"message": "All notifications marked as read"}
