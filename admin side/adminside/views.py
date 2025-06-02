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





# adminside/views.py


User = get_user_model()

@csrf_protect
def login(request):
    if request.method == 'POST':
        email = request.POST.get('email')
        password = request.POST.get('password')
        user = authenticate(request, email=email, password=password)

        if user is not None and user.is_superuser:
            auth_login(request, user)
            return redirect('dashboard')  # Make sure your URL name is correct
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

    # Annotate recruiter with candidate count
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

#@csrf_exempt
#@api_view(['POST'])
#@permission_classes([IsAuthenticated])       
#def admin_logout(request):
#    try:
#        request.user.auth_token.delete()
#        return Response({'message': 'Logged out successfully'}, status=HTTP_200_OK)
#    except Exception as e:
#       return Response({'error': 'Something went wrong while logging out.'}, status=HTTP_400_BAD_REQUEST)


@csrf_protect
@login_required
def admin_logout(request):
    django_logout(request)
    return redirect('login')

#api view

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
        'TalentStack <shahinshaji239@gmail.com>',  # Using the same verified sender as password reset
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
        skills = request.data.get('skills')  # Expecting comma-separated string
        industry = request.data.get('industry')
        gender = request.data.get('gender')
        current_ctc = request.data.get('current_ctc')
        expected_ctc = request.data.get('expected_ctc')
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
            current_ctc=current_ctc,
            expected_ctc=expected_ctc,
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
        # Get the candidate object linked to this recruiter (user)
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

    # Handle files in request.FILES
    if 'resume' in request.FILES:
        resume_file = request.FILES['resume']
        # Handle file saving or updating here
        candidate.resume = resume_file
        candidate.save()

    # Handle other fields
    serializer = CandidateSerializer(candidate, data=request.data, partial=True)
    
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=HTTP_200_OK)
    else:
        return Response(serializer.errors, status=HTTP_400_BAD_REQUEST)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_candidates(request):
    recruiter = request.user
    query = request.GET.get('q', '')
    location = request.GET.get('location', '')
    role = request.GET.get('role', '')
    skill = request.GET.get('skills', '')

    candidates = Candidate.objects.filter(recruiter=recruiter)

    if query:
        candidates = candidates.filter(
            Q(name__icontains=query) | Q(email__icontains=query) | Q(role__icontains=query)
        )

    if location:
        candidates = candidates.filter(location__icontains=location)

    if role:
        candidates = candidates.filter(role__icontains=role)

    if skill:
        candidates = candidates.filter(skills__name__icontains=skill)

    candidates = candidates.distinct()

    serializer = CandidateSerializer(candidates, many=True)
    return Response(serializer.data, status=HTTP_200_OK)

@csrf_exempt
@api_view(['POST'])
@authentication_classes([JWTAuthentication])  # Use JWT authentication
@permission_classes([IsAuthenticated])
def logout(request):
    try:
        # Get the refresh token from request data
        refresh_token = request.data.get('refresh_token')
        
        if refresh_token:
            # Blacklist the refresh token
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Logged out successfully'}, status=HTTP_200_OK)
        else:
            # If no refresh token provided, just return success
            # (Access token will expire naturally)
            return Response({'message': 'Logged out successfully'}, status=HTTP_200_OK)
            
    except Exception as e:
        return Response({'message': 'Logged out successfully'}, status=HTTP_200_OK)

@csrf_exempt
@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def simple_logout(request):
    """
    Simple logout that doesn't require refresh token
    Just validates that user is authenticated and returns success
    """
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


# In your views.py, specifically in bulk_import_excel function
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
    resume_files = request.FILES.getlist('resumes')  # Get list of resume files
    
    if not excel_file:
        return Response({'error': 'No file uploaded.'}, status=400)

    # File size validation (10MB limit)
    if excel_file.size > 10 * 1024 * 1024:
        return Response({'error': 'File size too large. Maximum 10MB allowed.'}, status=400)

    try:
        df = pd.read_excel(excel_file)

        if df.empty:
            return Response({'error': 'Uploaded Excel file is empty.'}, status=400)

        # Create a mapping of email to resume file if resumes are provided
        resume_map = {}
        if resume_files:
            for resume in resume_files:
                # Assuming resume filename contains email or some identifier
                # You might need to adjust this based on your file naming convention
                email = resume.name.split('_')[0]  # Adjust this based on your naming convention
                resume_map[email] = resume

        # Standardize column names (match frontend exactly)
        df.columns = (df.columns.str.lower()
                     .str.replace(r'\s+', '', regex=True)
                     .str.replace(r'[^a-z0-9]', '', regex=True))
        
        print("Standardized DataFrame columns:", df.columns.tolist())
        print("Sample data:", df.iloc[0].to_dict() if not df.empty else "No data")

        required_fields = ['name', 'email']
        
        # Check if required columns exist
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
                row_number = index + 2  # Excel row number (accounting for header)

                # Safely extract and validate required fields
                name = safe_string(row.get('name'))
                email = safe_string(row.get('email'))

                # Enhanced validation
                if not name or name.lower() in ['nan', 'null', 'none']:
                    skipped_rows.append({
                        'row': row_number, 
                        'error': f'Missing or invalid Name (got: "{row.get("name")}")'
                    })
                    continue
                    
                if not email or email.lower() in ['nan', 'null', 'none']:
                    skipped_rows.append({
                        'row': row_number, 
                        'error': f'Missing or invalid Email (got: "{row.get("email")}")'
                    })
                    continue

                # Email format validation
                if not validate_email_format(email):
                    skipped_rows.append({
                        'row': row_number, 
                        'error': f'Invalid email format: {email}'
                    })
                    continue

                # Convert and validate numeric fields safely
                try:
                    experience_val = row.get('experience', '0')
                    experience = str(int(pd.to_numeric(experience_val, errors='coerce'))) if pd.notna(experience_val) else '0'
                except:
                    experience = '0'

                try:
                    current_ctc_val = row.get('currentctc', '0')
                    current_ctc = str(float(pd.to_numeric(current_ctc_val, errors='coerce'))) if pd.notna(current_ctc_val) else '0'
                except:
                    current_ctc = '0'

                try:
                    expected_ctc_val = row.get('expectedctc', '0')
                    expected_ctc = str(float(pd.to_numeric(expected_ctc_val, errors='coerce'))) if pd.notna(expected_ctc_val) else '0'
                except:
                    expected_ctc = '0'

                candidate_data = {
                    'name': name,
                    'email': email,
                    'role': safe_string(row.get('role')),
                    'location': safe_string(row.get('location')),
                    'experience': experience,
                    'industry': safe_string(row.get('industry')),
                    'gender': safe_string(row.get('gender')),
                    'current_ctc': current_ctc,
                    'expected_ctc': expected_ctc,
                    'notes': safe_string(row.get('notes')),
                    'recruiter': request.user
                }

                try:
                    # Check if resume exists for this email
                    if email in resume_map:
                        candidate_data['resume'] = resume_map[email]

                    candidate, created = Candidate.objects.update_or_create(
                        email=candidate_data['email'],
                        defaults=candidate_data
                    )

                    # Handle many-to-many Skills
                    skills_str = safe_string(row.get('skills'))
                    if skills_str:
                        skill_names = [s.strip() for s in skills_str.split(',') if s.strip()]
                        skill_objs = []
                        for skill_name in skill_names:
                            if skill_name:  # Additional check
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
        # Base queryset
        candidates = Candidate.objects.filter(recruiter=user)

        # Optional filters with proper data type handling
        if role:
            candidates = candidates.filter(role__icontains=role)
        if location:
            candidates = candidates.filter(location__icontains=location)
        if experience:
            try:
                # FIXED: Proper integer filtering
                experience_int = int(experience)
                candidates = candidates.filter(experience=experience_int)
            except ValueError:
                # If not a valid integer, try partial match on string representation
                candidates = candidates.filter(experience__icontains=experience)

        # Prepare data
        data = []
        for c in candidates:
            data.append({
                'Name': c.name,
                'Email': c.email,
                'Role': c.role,
                'Location': c.location,
                'Experience': c.experience,
                'Industry': c.industry,
                'Gender': c.gender,
                'Current CTC': c.current_ctc,
                'Expected CTC': c.expected_ctc,
                'Skills': ', '.join([s.name for s in c.skills.all()]),
                'Notes': c.notes,
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
    'TalentStack <shahinshaji239@gmail.com>',  # Your verified Gmail
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
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST) # Use status constants

    try:
        user = User.objects.get(email=email)
        # Generate a new unique reset code
        reset_code = str(random.randint(100000, 999999))
        user.reset_code = reset_code # Ensure your User model has a 'reset_code' field
        user.save()

        # Send the reset email
        send_mail(
            'Reset Your TalentStack Password',
            f"Hi {user.name if hasattr(user, 'name') else user.email},\n\nHere is your 6-digit password reset code:\n🔐 {reset_code}\n\nEnter this code in the app to reset your password.\n\nThanks, \nTeam TalentStack",
            'TalentStack <shahinshaji239@gmail.com>',  # Replace with your verified sender
            [email],
            fail_silently=False,
        )

        return Response({'message': 'Reset code sent to your email'}, status=status.HTTP_200_OK)

    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND) # Use status constants
@api_view(['POST'])
@permission_classes([AllowAny])
def confirm_password_reset(request): # New view function
    reset_code = request.data.get('reset_code')
    new_password = request.data.get('new_password')

    if not reset_code or not new_password:
        return Response({'error': 'Reset code and new password are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(reset_code=reset_code)
        user.set_password(new_password) # Use set_password to correctly hash the password
        user.reset_code = None # Invalidate the used reset code
        user.save()
        return Response({'message': 'Password reset successfully'}, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        return Response({'error': 'Invalid or expired reset code'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

