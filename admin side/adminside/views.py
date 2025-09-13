from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_400_BAD_REQUEST, HTTP_200_OK, HTTP_404_NOT_FOUND, HTTP_201_CREATED
from rest_framework import status
from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from .models import Candidate, Skill
from .models import Candidate
from .serializers import CandidateSerializer
from django.db.models import Q
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from adminside.models import User, Candidate
from django.views.decorators.csrf import csrf_protect, csrf_exempt
from django.utils import timezone
from django.core.paginator import Paginator
from django.db.models import Count
from django.contrib.auth import authenticate, login as auth_login
from django.db import transaction
from django.db import IntegrityError
from django.contrib.auth import logout as django_logout
from django.http import JsonResponse, HttpResponse
from django.middleware.csrf import get_token
import pandas as pd
from rest_framework.parsers import MultiPartParser
from rest_framework.decorators import parser_classes, authentication_classes
from rest_framework.authentication import TokenAuthentication
from django.core.mail import send_mail
from django.utils.crypto import get_random_string
from .models import User
import random
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.conf import settings
from io import StringIO
import re
from django.core.exceptions import ValidationError
from django.core.validators import validate_email

User = get_user_model()

@csrf_protect
def login(request):
    if request.method == 'POST':
        email = request.POST.get('email')
        password = request.POST.get('password')
        user = authenticate(request, email=email, password=password)

        if user is not None and user.is_superuser:
            auth_login(request, user)
            return redirect('dashboard')
        else:
            return render(request, 'login.html', {'error': 'Invalid credentials or not authorized.'})

    return render(request, 'login.html')

@login_required
@csrf_protect
def admin_dashboard(request):
    total_candidates = Candidate.objects.count()

    today = timezone.now().date()
    yesterday = today - timezone.timedelta(days=1)

    today_count = Candidate.objects.filter(created_at__date=today).count()
    yesterday_count = Candidate.objects.filter(created_at__date=yesterday).count()

    growth_percent = 0
    if yesterday_count > 0:
        growth_percent = round((today_count - yesterday_count) / yesterday_count * 100, 2)

    recruiters = User.objects.filter(is_superuser=False, is_admin=False)

    search_query = request.GET.get('search', '')
    if search_query:
        recruiters = recruiters.filter(
            Q(name__icontains=search_query) |
            Q(email__icontains=search_query)
        )

    recruiters = recruiters.annotate(candidate_count=Count('candidates'))

    paginator = Paginator(recruiters, 5)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    return render(request, 'dashboard.html', {
        'total_candidates': total_candidates,
        'growth_percent': growth_percent,
        'page_obj': page_obj
    })

@csrf_protect
@login_required
def toggle_user_block(request, user_id):
    user = get_object_or_404(User, id=user_id)
    user.is_blocked = not user.is_blocked
    user.save()
    return redirect('dashboard')   

@csrf_protect
@login_required
def admin_logout(request):
    django_logout(request)
    return redirect('login')

# API Views

@api_view(['POST'])
@permission_classes([AllowAny])
def signup(request):
    email = request.data.get('email')
    password = request.data.get('password')
    name = request.data.get('name')

    if not email or not password or not name:
        return Response({"error": "All fields are required."}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(email=email).exists():
        return Response({"error": "Email already exists."}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(email=email, password=password, name=name, is_active=False)

    verification_code = str(random.randint(100000, 999999))
    user.verification_code = verification_code
    user.save()

    send_mail(
        'Welcome to TalentStack - Verify Your Email',
        f"""
        Hi {name},

        Welcome to TalentStack!

        Here is your 6-digit email verification code:
        🔐  {verification_code}

        Please enter this code in the app to activate your account.

        Thanks,  
        Team TalentStack
        """,
        'TalentStack <shahinshaji239@gmail.com>',
        [email],
        fail_silently=False,
    )

    return Response({"message": "User created successfully. Please check your email to verify your account."}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
def loginapi(request):
    email = request.data.get('email')
    password = request.data.get('password')

    user = User.objects.filter(email=email).first()
    if user and not user.is_active:
        return Response({'error': 'Please verify your email first.'}, status=status.HTTP_403_FORBIDDEN)
    elif user and user.check_password(password):
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_200_OK)
    else:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_candidate(request):
    try:
        name = request.data.get('name')
        email = request.data.get('email')
        role = request.data.get('role')
        location = request.data.get('location')
        experience = request.data.get('experience')
        skills = request.data.get('skills')
        industry = request.data.get('industry')
        gender = request.data.get('gender')
        current_ctc = request.data.get('current_ctc', '')
        expected_ctc = request.data.get('expected_ctc', '')
        notes = request.data.get('notes')
        resume = request.FILES.get('resume')

        if not all([name, email, role, location, experience]):
            return Response({'error': 'Missing required fields'}, status=HTTP_400_BAD_REQUEST)

        candidate = Candidate.objects.create(
            recruiter=request.user,
            name=name,
            email=email,
            role=role,
            location=location,
            experience=experience,
            industry=industry,
            gender=gender,
            current_ctc=current_ctc if current_ctc else '',
            expected_ctc=expected_ctc if expected_ctc else '',
            notes=notes,
            resume=resume
        )

        if skills:
            skill_names = [s.strip() for s in skills.split(',')]
            for skill_name in skill_names:
                skill_obj, created = Skill.objects.get_or_create(name=skill_name)
                candidate.skills.add(skill_obj)

        candidate.save()
        return Response({'message': 'Candidate added successfully'}, status=HTTP_201_CREATED)

    except Exception as e:
        return Response({'error': str(e)}, status=HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_candidates(request):
    user = request.user
    candidates = Candidate.objects.filter(recruiter=user).order_by('-created_at')
    serializer = CandidateSerializer(candidates, many=True)
    return Response(serializer.data, status=HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_candidate_detail(request, candidate_id):
    try:
        candidate = Candidate.objects.get(id=candidate_id, recruiter=request.user)
    except Candidate.DoesNotExist:
        return Response({'error': 'Candidate not found.'}, status=404)

    from .serializers import CandidateSerializer
    serializer = CandidateSerializer(candidate)
    return Response(serializer.data, status=200)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_candidate(request, candidate_id):
    user = request.user

    try:
        candidate = Candidate.objects.get(id=candidate_id, recruiter=user)
        candidate.delete()
        return Response({"message": "Candidate deleted successfully."}, status=HTTP_200_OK)
    except Candidate.DoesNotExist:
        return Response({"error": "Candidate not found."}, status=HTTP_404_NOT_FOUND)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_candidate(request, candidate_id):
    user = request.user
    try:
        candidate = Candidate.objects.get(id=candidate_id, recruiter=user)
    except Candidate.DoesNotExist:
        return Response({"error": "Candidate not found."}, status=HTTP_404_NOT_FOUND)

    # Handle file uploads
    if 'resume' in request.FILES:
        candidate.resume = request.FILES['resume']

    # Handle other fields with proper CTC handling
    candidate.name = request.data.get('name', candidate.name)
    candidate.email = request.data.get('email', candidate.email)
    candidate.role = request.data.get('role', candidate.role)
    candidate.location = request.data.get('location', candidate.location)
    candidate.experience = request.data.get('experience', candidate.experience)
    candidate.industry = request.data.get('industry', candidate.industry)
    candidate.gender = request.data.get('gender', candidate.gender)
    candidate.notes = request.data.get('notes', candidate.notes)
    
    # Fixed CTC handling - don't convert empty strings to '0'
    current_ctc = request.data.get('current_ctc', '')
    expected_ctc = request.data.get('expected_ctc', '')
    candidate.current_ctc = current_ctc if current_ctc and current_ctc.strip() else ''
    candidate.expected_ctc = expected_ctc if expected_ctc and expected_ctc.strip() else ''

    # Handle skills
    skills_data = request.data.get('skills', '')
    if skills_data:
        candidate.skills.clear()
        if isinstance(skills_data, str):
            skill_names = [s.strip() for s in skills_data.split(',')]
        else:
            skill_names = skills_data
        
        for skill_name in skill_names:
            if skill_name.strip():
                skill_obj, created = Skill.objects.get_or_create(name=skill_name.strip())
                candidate.skills.add(skill_obj)

    candidate.save()
    
    serializer = CandidateSerializer(candidate)
    return Response(serializer.data, status=HTTP_200_OK)

# Fixed search functionality
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_candidates(request):
    recruiter = request.user
    query = request.GET.get('q', '')
    location = request.GET.get('location', '')
    role = request.GET.get('role', '')
    skills = request.GET.get('skills', '')

    candidates = Candidate.objects.filter(recruiter=recruiter)

    # Apply text search across multiple fields
    if query:
        candidates = candidates.filter(
            Q(name__icontains=query) | 
            Q(email__icontains=query) | 
            Q(role__icontains=query) |
            Q(location__icontains=query) |
            Q(skills__name__icontains=query) |
            Q(industry__icontains=query) |
            Q(notes__icontains=query)
        )

    # Apply specific filters
    if location:
        candidates = candidates.filter(location__icontains=location)

    if role:
        candidates = candidates.filter(role__icontains=role)

    if skills:
        candidates = candidates.filter(skills__name__icontains=skills)

    candidates = candidates.distinct().order_by('-created_at')
    serializer = CandidateSerializer(candidates, many=True)
    return Response(serializer.data, status=HTTP_200_OK)

@csrf_exempt
@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def logout(request):
    try:
        refresh_token = request.data.get('refresh_token')
        
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Logged out successfully'}, status=HTTP_200_OK)
        else:
            return Response({'message': 'Logged out successfully'}, status=HTTP_200_OK)
            
    except Exception as e:
        return Response({'message': 'Logged out successfully'}, status=HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    user = request.user
    return Response({
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "is_admin": user.is_admin,
    }, status=HTTP_200_OK)

# Enhanced bulk import with better handling
def safe_string(value):
    """Safely convert value to string, handling NaN and None"""
    if pd.isna(value) or value is None:
        return ''
    return str(value).strip()

def validate_email_format(email):
    """Validate email format using Django's built-in validator"""
    try:
        validate_email(email)
        return True
    except ValidationError:
        return False

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def bulk_import_excel(request):
    excel_file = request.FILES.get('file')
    resume_files = request.FILES.getlist('resumes')
    
    if not excel_file:
        return Response({'error': 'No file uploaded.'}, status=400)

    if excel_file.size > 10 * 1024 * 1024:
        return Response({'error': 'File size too large. Maximum 10MB allowed.'}, status=400)

    try:
        df = pd.read_excel(excel_file)

        if df.empty:
            return Response({'error': 'Uploaded Excel file is empty.'}, status=400)

        # Create resume mapping
        resume_map = {}
        if resume_files:
            for resume in resume_files:
                email = resume.name.split('_')[0]
                resume_map[email] = resume

        # Get original columns before standardization
        original_columns = list(df.columns)

        # Standardize column names
        df.columns = (df.columns.str.lower()
                     .str.replace(r'\s+', '', regex=True)
                     .str.replace(r'[^a-z0-9]', '', regex=True))
        
        print("Standardized DataFrame columns:", df.columns.tolist())

        required_fields = ['name', 'email']
        missing_columns = [field for field in required_fields if field not in df.columns]
        if missing_columns:
            return Response({
                'error': f'Missing required columns: {", ".join(missing_columns)}. '
                        f'Available columns: {", ".join(df.columns.tolist())}'
            }, status=400)

        created_count = 0
        updated_count = 0
        skipped_rows = []

        with transaction.atomic():
            for index, row in df.iterrows():
                row_number = index + 2

                name = safe_string(row.get('name'))
                email = safe_string(row.get('email'))

                if not name or name.lower() in ['nan', 'null', 'none']:
                    skipped_rows.append({
                        'row': row_number, 
                        'error': f'Missing or invalid Name'
                    })
                    continue
                    
                if not email or email.lower() in ['nan', 'null', 'none']:
                    skipped_rows.append({
                        'row': row_number, 
                        'error': f'Missing or invalid Email'
                    })
                    continue

                if not validate_email_format(email):
                    skipped_rows.append({
                        'row': row_number, 
                        'error': f'Invalid email format: {email}'
                    })
                    continue

                # Handle CTC fields properly - avoid converting empty to '0'
                current_ctc_val = safe_string(row.get('currentctc', ''))
                expected_ctc_val = safe_string(row.get('expectedctc', ''))
                
                # Only convert to string if there's actual data
                current_ctc = current_ctc_val if current_ctc_val and current_ctc_val not in ['0', '0.0', 'nan'] else ''
                expected_ctc = expected_ctc_val if expected_ctc_val and expected_ctc_val not in ['0', '0.0', 'nan'] else ''

                candidate_data = {
                    'name': name,
                    'email': email,
                    'role': safe_string(row.get('role', '')),
                    'location': safe_string(row.get('location', '')),
                    'experience': safe_string(row.get('experience', '')),
                    'industry': safe_string(row.get('industry', '')),
                    'gender': safe_string(row.get('gender', '')),
                    'current_ctc': current_ctc,
                    'expected_ctc': expected_ctc,
                    'notes': safe_string(row.get('notes', '')),
                    'recruiter': request.user
                }

                try:
                    if email in resume_map:
                        candidate_data['resume'] = resume_map[email]

                    candidate, created = Candidate.objects.update_or_create(
                        email=candidate_data['email'],
                        defaults=candidate_data
                    )

                    # Handle skills
                    skills_str = safe_string(row.get('skills', ''))
                    if skills_str:
                        skill_names = [s.strip() for s in skills_str.split(',') if s.strip()]
                        skill_objs = []
                        for skill_name in skill_names:
                            if skill_name:
                                skill_obj, _ = Skill.objects.get_or_create(name=skill_name)
                                skill_objs.append(skill_obj)
                        candidate.skills.set(skill_objs)
                    else:
                        candidate.skills.clear()

                    if created:
                        created_count += 1
                    else:
                        updated_count += 1

                except IntegrityError as e:
                    skipped_rows.append({
                        'row': row_number, 
                        'error': f'Database integrity error: {str(e)}'
                    })
                except Exception as e:
                    skipped_rows.append({
                        'row': row_number, 
                        'error': f'Unexpected error: {str(e)}'
                    })

        return Response({
            'message': 'Bulk import completed.',
            'created': created_count,
            'updated': updated_count,
            'skipped': skipped_rows,
            'total_rows_processed': len(df)
        }, status=201)

    except Exception as e:
        print(f"Excel processing error: {str(e)}")
        return Response({'error': f'Error reading Excel file: {str(e)}'}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_candidates_excel(request):
    user = request.user
    role = request.GET.get('role')
    location = request.GET.get('location')
    experience = request.GET.get('experience')
    export_format = request.GET.get('format', 'excel')

    try:
        candidates = Candidate.objects.filter(recruiter=user)

        if role:
            candidates = candidates.filter(role__icontains=role)
        if location:
            candidates = candidates.filter(location__icontains=location)
        if experience:
            try:
                experience_int = int(experience)
                candidates = candidates.filter(experience=experience_int)
            except ValueError:
                candidates = candidates.filter(experience__icontains=experience)

        data = []
        for c in candidates:
            data.append({
                'Name': c.name,
                'Email': c.email,
                'Role': c.role,
                'Location': c.location,
                'Experience': c.experience,
                'Industry': c.industry or '',
                'Gender': c.gender or '',
                'Current CTC': c.current_ctc or '',
                'Expected CTC': c.expected_ctc or '',
                'Skills': ', '.join([s.name for s in c.skills.all()]),
                'Notes': c.notes or '',
            })

        if not data:
            return Response({'error': 'No candidates found matching the criteria.'}, status=404)

        df = pd.DataFrame(data)

        if export_format.lower() == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="candidates_export.csv"'
            
            csv_buffer = StringIO()
            df.to_csv(csv_buffer, index=False)
            response.write(csv_buffer.getvalue())
            return response
        else:
            response = HttpResponse(
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = 'attachment; filename="candidates_export.xlsx"'
            
            with pd.ExcelWriter(response, engine='openpyxl') as writer:
                df.to_excel(writer, index=False, sheet_name='Candidates')

            return response

    except Exception as e:
        print(f"Export error: {str(e)}")
        return Response({'error': f'Error exporting data: {str(e)}'}, status=500)
    
@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email(request):
    email = request.data.get('email')
    code = request.data.get('code')

    if not email or not code:
        return Response({'error': 'Email and code are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
        if user.verification_code == code:
            user.is_active = True
            user.verification_code = None
            user.save()

            refresh = RefreshToken.for_user(user)
            return Response({
                'message': 'Email verified successfully',
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_200_OK)
        else:
            return Response({'error': 'Invalid verification code'}, status=status.HTTP_400_BAD_REQUEST)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([AllowAny])
def resend_verification_code(request):
    email = request.data.get('email')

    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
        if user.is_active:
            return Response({'message': 'Email already verified'}, status=status.HTTP_200_OK)

        verification_code = str(random.randint(100000, 999999))
        user.verification_code = verification_code
        user.save()

        name = user.name if hasattr(user, 'name') else user.email

        send_mail(
             'Verify Your Email',
              f"""
             Hi {name},

             Welcome to TalentStack!

            Here is your 6-digit email verification code:
            🔐  {verification_code}

            Please enter this code in the app to activate your account.

            Thanks,  
            Team TalentStack
            """,
    'TalentStack <shahinshaji239@gmail.com>',
    [email],
    fail_silently=False,
)

        return Response({'message': 'Verification code resent'}, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([AllowAny])
def request_password_reset(request):
    email = request.data.get('email')
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
        reset_code = str(random.randint(100000, 999999))
        user.reset_code = reset_code
        user.save()

        send_mail(
            'Reset Your TalentStack Password',
            f"Hi {user.name if hasattr(user, 'name') else user.email},\n\nHere is your 6-digit password reset code:\n🔐 {reset_code}\n\nEnter this code in the app to reset your password.\n\nThanks, \nTeam TalentStack",
            'TalentStack <shahinshaji239@gmail.com>',
            [email],
            fail_silently=False,
        )

        return Response({'message': 'Reset code sent to your email'}, status=status.HTTP_200_OK)

    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([AllowAny])
def confirm_password_reset(request):
    reset_code = request.data.get('reset_code')
    new_password = request.data.get('new_password')

    if not reset_code or not new_password:
        return Response({'error': 'Reset code and new password are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(reset_code=reset_code)
        user.set_password(new_password)
        user.reset_code = None
        user.save()
        return Response({'message': 'Password reset successfully'}, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        return Response({'error': 'Invalid or expired reset code'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)